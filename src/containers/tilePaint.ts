import G from '../globals'
import { EntityContainer } from './entity'
import { AdjustmentFilter } from '@pixi/filter-adjustment'
import { TileContainer } from './tile'
import factorioData from '../factorio-data/factorioData'
import { InventoryContainer } from './inventory'

export class TilePaintContainer extends PIXI.Container {

    static size = 2

    static getTilePositions() {
        return [...Array(Math.pow(TilePaintContainer.size, 2)).keys()].map(i => {
            const offset = TilePaintContainer.size / 2 - 0.5
            return {
                x: i % TilePaintContainer.size - offset,
                y: (i - i % TilePaintContainer.size) / TilePaintContainer.size - offset
            }
        })
    }

    areaVisualization: PIXI.Sprite | PIXI.Sprite[] | undefined
    directionType: string
    direction: string
    holdingLeftClick: boolean
    holdingRightClick: boolean
    filter: AdjustmentFilter
    icon: PIXI.DisplayObject

    constructor(name: string, position: IPoint) {
        super()

        this.name = name
        this.direction = 'left'

        this.position.set(position.x, position.y)

        this.filter = new AdjustmentFilter({ red: 0.4, green: 1, blue: 0.4 })
        this.filters = [this.filter]

        this.interactive = true
        this.interactiveChildren = false
        this.buttonMode = true

        this.holdingLeftClick = false

        this.icon = InventoryContainer.createIcon(this.getItemName())
        this.icon.visible = false
        G.app.stage.addChild(this.icon)
        this.changeIconPos = this.changeIconPos.bind(this)
        window.addEventListener('mousemove', this.changeIconPos)
        this.changeIconPos(G.app.renderer.plugins.interaction.mouse.global)

        G.BPC.transparentEntities()

        this.on('pointerdown', this.pointerDownEventHandler)
        this.on('pointerup', this.pointerUpEventHandler)
        this.on('pointerupoutside', this.pointerUpEventHandler)

        this.redraw()
    }

    changeIconPos(e: IPoint) {
        this.icon.position.set(e.x + 16, e.y + 16)
    }

    hide() {
        this.visible = false
        G.BPC.transparentEntities(false)

        this.changeIconPos(G.app.renderer.plugins.interaction.mouse.global)
        this.icon.visible = true
    }

    show() {
        this.visible = true
        G.BPC.transparentEntities()

        this.icon.visible = false
    }

    destroy() {
        G.BPC.transparentEntities(false)
        super.destroy()

        window.removeEventListener('mousemove', this.changeIconPos)
        this.icon.destroy()
    }

    getItemName() {
        return factorioData.getTile(this.name).minable.result
    }

    increaseSize() {
        if (TilePaintContainer.size === 20) return
        TilePaintContainer.size++
        this.reposition()
        this.redraw()
    }

    decreaseSize() {
        if (TilePaintContainer.size === 1) return
        TilePaintContainer.size--
        this.reposition()
        this.redraw()
    }

    reposition() {
        const pos = EntityContainer.getPositionFromData(
            G.gridData.position,
            { x: TilePaintContainer.size, y: TilePaintContainer.size }
        )
        this.position.set(pos.x, pos.y)
    }

    rotate() {
        if (this.name.includes('hazard')) {
            this.name = this.name.includes('left') ?
                this.name.replace('left', 'right') :
                this.name.replace('right', 'left')
            this.redraw()
        }
    }

    redraw() {
        this.removeChildren()

        this.addChild(...TilePaintContainer.getTilePositions().map(p => {
            const s = TileContainer.generateSprite(this.name, { x: p.x + this.position.x, y: p.y + this.position.y })
            s.position.set(p.x * 32, p.y * 32)
            s.alpha = 0.5
            return s
        }))

        this.hitArea = new PIXI.Rectangle(
            -TilePaintContainer.size * 16,
            -TilePaintContainer.size * 16,
            TilePaintContainer.size * 32,
            TilePaintContainer.size * 32
        )
    }

    pointerDownEventHandler(e: PIXI.interaction.InteractionEvent) {
        if (e.data.button === 0) {
            this.holdingLeftClick = true
            this.placeEntityContainer()
        } else if (e.data.button === 2) {
            this.holdingRightClick = true
            this.removeContainerUnder()
        }
    }

    pointerUpEventHandler(e: PIXI.interaction.InteractionEvent) {
        if (e.data.button === 0) {
            this.holdingLeftClick = false
        } else if (e.data.button === 2) {
            this.holdingRightClick = false
        }
    }

    moveAtCursor() {
        const position = G.gridData.position
        if (this.holdingRightClick) this.removeContainerUnder()

        const pos = EntityContainer.getPositionFromData(
            position,
            { x: TilePaintContainer.size, y: TilePaintContainer.size }
        )
        this.position.set(pos.x, pos.y)

        if (this.holdingLeftClick) this.placeEntityContainer()
    }

    removeContainerUnder() {
        const position = EntityContainer.getGridPosition(this.position)

        TilePaintContainer.getTilePositions()
            .map(p => ({ x: p.x + position.x, y: p.y + position.y }))
            .forEach(p => {
                const tileUnder = TileContainer.mappings.get(`${p.x},${p.y}`)
                if (tileUnder) {
                    tileUnder.destroy()
                    G.bp.removeTile(p)
                }
            })
    }

    placeEntityContainer() {
        const position = EntityContainer.getGridPosition(this.position)

        TilePaintContainer.getTilePositions()
            .map(p => ({ x: p.x + position.x, y: p.y + position.y }))
            .forEach(p => {
                const tileUnder = TileContainer.mappings.get(`${p.x},${p.y}`)
                if (tileUnder) tileUnder.destroy()

                G.bp.createTile(this.name, p)
                G.BPC.tiles.addChild(new TileContainer(this.name, p))
            })
    }
}
