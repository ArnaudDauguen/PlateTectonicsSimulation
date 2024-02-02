const thrower = (msg) => { throw Error(msg) }
const arrayEquals = (a, b) => {
    if (a === b) return true
    if (a == null || b == null) return false
    if (a.length !== b.length) return false

    let tmpA = [...a]
    let tmpB = [...b]

    tmpA.sort((a, b) => a.x - b.x + a.y - b.y)
    tmpB.sort((a, b) => a.x - b.x + a.y - b.y)

    for (let i = 0; i < tmpA.length; i++) {
        if (tmpA[i] !== tmpB[i]) return false
    }

    return true
}
async function sleep(ms) {return new Promise(resolve => setTimeout(resolve, ms))}
function areTwoEdgesSame(e1, e2) {
    return e1[0].IsSameAs(e2[0]) && e1[1].IsSameAs(e2[1])
}

function getNeighbours(neighbourhood, tileList, polyId){
    return tileList.filter((t, i) => neighbourhood[polyId].indexOf(i) > -1)
}

function isEdgeInBoundTolerance(edge, bound, tolerance){
    return (edge[0].x >= bound - tolerance && edge[0].x <= bound + tolerance)
        || (edge[1].x >= bound - tolerance && edge[1].x <= bound + tolerance)
}

// function CollapseCells(){
//     console.log("hu")
// }

function shuffle(array) {
    let copy = [...array]
    let m = copy.length, t, i;
    // While there remain elements to shuffle...
    while (m) {
        // Pick a remaining element...
        i = Math.floor(Math.random() * m--)
        // And swap it with the current element
        t = copy[m]
        copy[m] = copy[i]
        copy[i] = t
    }
    return array
}

const TERRAINTYPES = {
    undefined: {
        colour: "black",
    },
    water: {
        colour: "DodgerBlue",
    },
    deepWater: {
        colour: "blue",
    },
    land: {
        colour: "ForestGreen",
    },
    mountain: {
        colour: "Sienna",
    },
}

const COLOURS = ["red", "green", "blue", "yellow", "cyan", "purple", "orange", "brown", "grey", "olive", "PaleVioletRed", "SkyBlue", "Violet", "Teal", "YellowGreen", "black", "Beige"]

const DIRECTIONS = {
    N : 0,
    NE: 1,
    E : 2,
    SE: 3,
    S : 4,
    SW: 5,
    W : 6,
    NW: 7,
}

function getRandomDirection(){
    const options = Object.keys(DIRECTIONS)
    return DIRECTIONS[options[Math.floor(Math.random() * options.length)]]
}

function rotateDirection(input, change){
    input = input + change
    if(input < 0)
        input += Object.keys(DIRECTIONS).length
    if(input > Object.keys(DIRECTIONS).length -1)
        input -= Object.keys(DIRECTIONS).length
    return DIRECTIONS[Object.keys(DIRECTIONS).find(key => DIRECTIONS[key] === input)]
}

function getOppositeDirection(input){
    return rotateDirection(input, Object.keys(DIRECTIONS).length / 2)
}

function shiftDirectionRandom(initialDirection, greatSuccesChance = 0.05, minorSuccesChance = 0.2, greatSuccesValue = 2, minorSuccesValue = 1){
    const rand = Math.random()
        if(rand < greatSuccesChance)
            return rotateDirection(initialDirection, Math.random() < 0.5 ? -greatSuccesValue : greatSuccesValue)
        if(rand < minorSuccesChance)
            return rotateDirection(initialDirection, Math.random() < 0.5 ? -minorSuccesValue : minorSuccesValue)
        return initialDirection
}

function areDirectionsNearlyEqual(a, b, tolerance = 1){
    const diff = Math.abs(a - b)
    return (diff <= tolerance) || ((Object.keys(DIRECTIONS).length - diff) <= tolerance)
}

function areDirectionsOpposite(a, b, tolerance = 0){
    return areDirectionsNearlyEqual(a, getOppositeDirection(b), tolerance)
}

function areDirectionsDivergente(a, b, tolerance = 2){
    return areDirectionsNearlyEqual(a, getOppositeDirection(b), tolerance)
}

function getDirectionBetweenPoints(start, end){
    // /!\ divide by 0 return Infinity (still valid value)
    const yRatio = end.y - start.y / end.x - start.x

    if(end.x > start.x){ // east
        if(end.y > start.y){ // south
            if(yRatio < 0.4)
                return DIRECTIONS.E
            if(yRatio > 2.5)
                return DIRECTIONS.S
            return DIRECTIONS.SE
        }else{ // north
            if(yRatio > -0.4)
                return DIRECTIONS.E
            if(yRatio < -2.5)
                return DIRECTIONS.N
            return DIRECTIONS.NE
        }
    }else{ // west
        if(end.y > start.y){ // south
            if(yRatio > -0.4)
                return DIRECTIONS.W
            if(yRatio < -2.5)
                return DIRECTIONS.S
            return DIRECTIONS.SW
        }else{ // north
            if(yRatio < 0.4)
                return DIRECTIONS.W
            if(yRatio > 2.5)
                return DIRECTIONS.N
            return DIRECTIONS.NW
        }
    }
}

function getDirectionBetweenTiles(start, end){
    return getDirectionBetweenPoints(start.center, end.center)
}

function displayPlates(cp, tiles, size = 4){
    tiles.forEach(tile => cp.canvas.DrawPixle(tile.center, COLOURS[tile.plateId % COLOURS.length], tile.plateId === -1 ? 0 : size))
}

function displayTerrain(cp, tiles, size = 20){
    tiles.forEach(tile => cp.canvas.DrawPixle(tile.center, tile.terrainType.colour || "black", size))
}

function saveWorldAsImg(){
    const canvas = document.getElementById('canvas')
    let img = new Image()
    img.src = canvas.toDataURL()
    document.body.append(img)
}

class PolygonVoronoi {
    constructor(center, cp) {
        this.center = center
        this.edges = []

        this.cp = cp

        this.closed = false

        this.plateComponentId = -1
        this.plateId = -1

        this.terrainType = TERRAINTYPES.undefined
        this.curHeight = -1
        this.newHeight = -1

    }

    AddEdge(edge) {
        let reversed = [...edge].reverse()
        for (let e of this.edges) {
            if (areTwoEdgesSame(e, edge) || areTwoEdgesSame(e, reversed)) {
                return
            }
        }

        this.edges.push(edge)
    }

    BuildUp(){
        for (let t1 of this.center.triangles) {
            for (let t2 of this.center.triangles) {
                if (t1.IsAdjacent(t2))
                    this.AddEdge([t1.CircumcircleCenter(), t2.CircumcircleCenter()])
            }
        }
    }

    IsClosed() {
        if (this.edges.length < 3)
            return false

        for (let e1 in this.edges) {
            let edge0 = false
            let edge1 = false

            for (let e2 in this.edges) {
                if (e1 === e2) {
                    continue
                }

                if (this.edges[e1][0].IsSameAs(this.edges[e2][0]) || this.edges[e1][0].IsSameAs(this.edges[e2][1])) {
                    edge0 = true
                }

                if (this.edges[e1][1].IsSameAs(this.edges[e2][0]) || this.edges[e1][1].IsSameAs(this.edges[e2][1])) {
                    edge1 = true
                }
            }

            if (!(edge0 && edge1))
                return false
        }

        return true
    }

    Close() {
        if (this.edges.length < 3) {
            this.closed = false
            return false
        }
        let edges = this.edges

        let orderedEdges = edges.splice(0, 1)

        let sideFound = true
        while (edges.length > 0 && sideFound) {
            sideFound = false

            for (let i = 0; i < edges.length; ++i) {
                if (edges[i][0].IsSameAs(orderedEdges[orderedEdges.length - 1][1])) {
                    orderedEdges.push(...edges.splice(i, 1))
                    sideFound = true
                    break
                } else if (edges[i][1].IsSameAs(orderedEdges[orderedEdges.length - 1][1])) {
                    let reversed = edges.splice(i, 1)[0]
                    orderedEdges.push(reversed.reverse())
                    sideFound = true
                    break
                }
            }
        }

        //finished with side found
        if (sideFound) {
            this.edges = orderedEdges
            this.closed = this.edges[0][0].IsSameAs(this.edges[this.edges.length - 1][1])
            return this.closed
        }

        return false
    }

    Lloyd(){
        const vertices = this.edges.map(e => e[0])
        if(vertices.length < 3) return
        let xNumerator = 0, yNumerator = 0, denominator = 0
    
        //Standard points
        for(let i = 0; i < vertices.length -1; ++i){
            let tmpDenum = vertices[i].x * vertices[i+1].y - vertices[i].y * vertices[i+1].x
            xNumerator += (vertices[i].x + vertices[i+1].x) * tmpDenum
            yNumerator += (vertices[i].y + vertices[i+1].y) * tmpDenum
            denominator += tmpDenum
        }
        //Last point
        let tmpDenum = vertices[vertices.length -1].x * vertices[0].y - vertices[vertices.length -1].y * vertices[0].x
        xNumerator += (vertices[vertices.length -1].x + vertices[0].x) * tmpDenum
        yNumerator += (vertices[vertices.length -1].y + vertices[0].y) * tmpDenum
        denominator += tmpDenum
    
        // console.log("x:", xNumerator/(3*denominator), "y:", yNumerator/(3*denominator))
        this.center = new Point(xNumerator/(3*denominator), yNumerator/(3*denominator))
    }
}

class Canvas {
    constructor(id = 'canvas') {
        this.element = document.getElementById(id)
        this.width = this.element.width
        this.height = this.element.height
        this.ctx = this.element.getContext("2d")
        this.data = this.ctx.getImageData(0, 0, this.width, this.height)
    }

    DrawPixle(p, color = 'black', thickness = 5) {
        this.ctx.save()
        this.ctx.fillStyle = color
        this.ctx.fillRect(p.x - thickness / 2, p.y - thickness / 2, thickness, thickness)
        this.ctx.restore()
    }

    DrawText(text, p, color) {
        this.ctx.save()
        this.ctx.font = '20px serif'
        this.ctx.fillStyle = color
        this.ctx.fillText(text, p.x, p.y)
        this.ctx.restore()
    }

    DrawStroke(p1, p2, color = 'black', lineWidth = 2) {
        this.ctx.save()
        this.ctx.beginPath()
        this.ctx.strokeStyle = color
        this.ctx.lineWidth = lineWidth
        this.ctx.moveTo(p1.x, p1.y)
        this.ctx.lineTo(p2.x, p2.y)
        this.ctx.stroke()
        this.ctx.restore()
    }

    DrawPolygon(edges, color = null, thickness = 2) {
        for (let i = 0; i < edges.length; i++) {
            this.DrawStroke(edges[i][0], edges[i][1], color || ["red", "green", "blue"][i % 3], thickness)
        }
    }

    DrawCircle(center, radius, color = "green") {
        this.ctx.save()
        this.ctx.strokeStyle = color
        this.ctx.beginPath()
        this.ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI)
        this.ctx.stroke()
        this.ctx.restore()
    }

    Clear() {
        this.ctx.clearRect(0, 0, this.width, this.height)
    }
}

class Point {
    constructor(x, y, z = 0) {
        this.x = x || 0
        this.y = y || 0
        this.z = z || 0
    
        this.triangles = []
    }

    Distance(point) {
        return Math.sqrt((point.x - this.x) ** 2 + (point.y - this.y) ** 2)
    }

    IsSameAs(point, epsilon = 0.0001) {
        return Math.abs(this.x - point.x) < epsilon
            && Math.abs(this.y - point.y) < epsilon
            && Math.abs(this.z - point.z) < epsilon
    }

    Translate(x, y, z = 0){
        if(x != 0)
            this.x = this.x + x
        if(y != 0)
            this.y = this.y + y
        if(z != 0)
            this.z = this.z + z
        return this
    }
}

class CloudPoints {
    constructor(density = 10, minX = 0, maxX = 10, minY = 0, maxY = 10) {
        this.points = []
        this.triangles = []
        this.canvas = new Canvas()

        for (let i = 0; i < density; i++) {
            let x = Math.random() * maxX + minX
            let y = Math.random() * maxY + minY

            let point = new Point(x, y)
            this.points.push(point)
        }
    }

    DelaunayBowyerWatson(DEBUG = false, color = 'black') {
        let superTriangle = this.SuperTriangle()
        let triangulation = [superTriangle]
        let toDelete = []
        let container = []
        this.triangles = []

        for (let point of this.points) {
            toDelete = triangulation.filter(triangle => triangle.Circumcircle().Contains(point))
            container = []

            for (let triangle of toDelete) {
                for (let edge of triangle.Edges()) {
                    if (triangle.FindAdjacentToEdge(toDelete, edge) === null) container.push(edge)
                }
            }

            triangulation = triangulation.filter(t => !toDelete.includes(t))

            for (let edge of container) {
                triangulation.push(new Triangle(point, edge[0], edge[1]))
            }
        }

        triangulation = triangulation.filter(t => !t.Vertices().some(v => superTriangle.Vertices().includes(v)))

        for (let triangle of triangulation) {
            for (let p of triangle.Vertices()) {
                p.triangles.push(triangle)
            }
        }

        if (DEBUG) {
            for (let t of triangulation) {
                this.canvas.DrawPolygon(t.Edges(), color)
                //this.canvas.DrawCircle(t.Circumcircle().center, t.Circumcircle().radius, "green")
            }
            for (let p in this.points) {
                this.canvas.DrawPixle(this.points[p], "red")
                //console.log(p, this.points[p])
                this.canvas.DrawText(p, this.points[p], 'blue')
            }
        }

        return triangulation
    }

    SuperTriangle() {
        let pMaxX = this.points.sort((a, b) => { return b.x - a.x })[0]
        let pMinX = this.points.sort((a, b) => { return a.x - b.x })[0]
        let pMaxY = this.points.sort((a, b) => { return b.y - a.y })[0]
        let pMinY = this.points.sort((a, b) => { return a.y - b.y })[0]

        let a = new Point(pMinX.x - 50, pMinY.y - 50)
        let b = new Point((pMaxX.x - pMinX.x + 25) * 2, pMinY.y)
        let c = new Point(pMinX.x, (pMaxY.y - pMinY.y + 25) * 2)

        return new Triangle(a, b, c)
    }
}

class Triangle {
    constructor(p1, p2, p3, done = false) {
        this.p1 = (p1 instanceof Point) ? p1 : thrower('P1 must be a point')
        this.p2 = (p2 instanceof Point) ? p2 : thrower("P2 must be a point")
        this.p3 = (p3 instanceof Point) ? p3 : thrower("P3 must be a point")

        this.isCalculated = false
    }

    CircumcircleCenter() {
        let ad = this.p1.x ** 2 + this.p1.y ** 2
        let bd = this.p2.x ** 2 + this.p2.y ** 2
        let cd = this.p3.x ** 2 + this.p3.y ** 2
        let d = 2 * (this.p1.x * (this.p2.y - this.p3.y) + this.p2.x * (this.p3.y - this.p1.y) + this.p3.x * (this.p1.y - this.p2.y))
        let mean = new Point(
            1 / d * (ad * (this.p2.y - this.p3.y) + bd * (this.p3.y - this.p1.y) + cd * (this.p1.y - this.p2.y)),
            1 / d * (ad * (this.p3.x - this.p2.x) + bd * (this.p1.x - this.p3.x) + cd * (this.p2.x - this.p1.x))
        )
        
        return mean
    }

    Circumcircle() {
        const mean = this.CircumcircleCenter()

        return new Circle(mean, this.p1.Distance(mean))
    }

    Edges() {
        return [
            [this.p1, this.p2],
            [this.p2, this.p3],
            [this.p3, this.p1],
        ]
    }

    Vertices() {
        return [this.p1, this.p2, this.p3]
    }

    AdjacentEdges(triangle) {
        if (!(triangle instanceof Triangle)) thrower("triangle must be a Triangle")

        return this.Edges().filter((e) => {
            for (let edge of triangle.Edges()) {
                if (arrayEquals(edge, e)) return true
            }

            return false
        })
    }

    IsAdjacent(triangle) {
        const adjacentEdges = this.AdjacentEdges(triangle).length
        return  0 < adjacentEdges && adjacentEdges < 2
    }

    FindAdjacentToEdge(triangles, edge) {
        for (let triangle of triangles) {
            let adjacentEdges = this.AdjacentEdges(triangle)

            if (adjacentEdges.length !== 1) continue
            if (arrayEquals(adjacentEdges[0], edge)) return triangle
        }

        return null
    }
}

class Circle {
    constructor(center, radius) {
        this.center = (center instanceof Point) ? center : thrower('Center must be a point')
        this.radius = radius || 1
    }

    Contains(point) {
        if (!(point instanceof Point)) thrower('Point must be a point')

        return ((point.x - this.center.x) ** 2 + (point.y - this.center.y) ** 2 < this.radius ** 2)
    }
}

async function main(W_WIDTH = 1280, W_HEIGH = 720,
        POINT_QTY = 7000, IT_MAX = 3,
        CONF_shouldReplaceMapOnTopLeft = false,
        DEBUG_P1 = false,
        DEBUG_P2 = false,
        DEBUG_P3 = false, CONF_wishedPlateQty, CONF_harmonizationQty,
        DEBUG_P4 = false, CONF_seaToLandRatio = 0.85, CONF_worldAge = 10, CONF_seaLevel = 60, CONF_mountainLevel = 100, CONF_baseWaterTileHeight = 20, CONF_baseLandTileHeight = 80, CONF_simulation_fps = 3,
        CONF_GIF_doSave = true, CONF_GIF_FPS = 3, 
) {

    // setup GIF saver
    const canvas = document.getElementById('canvas')
    const context = canvas.getContext("2d")
    context.fillStyle = 'rgb(255, 255, 255)'
    context.fillRect(0, 0, canvas.width, canvas.height) //GIF can't do transparent so do white

    const encoder = new GIFEncoder()
    encoder.setRepeat(0)
    encoder.setDelay(Math.floor(1000 / CONF_GIF_FPS) || 333)
    encoder.willReadFrequently = true
    if(CONF_GIF_doSave)
        encoder.start()

    // const SEED = "aaaaaaa"
    // Math.seedrandom(SEED)

    const widthOffset = .20 * W_WIDTH
    const heighOffset = .20 * W_HEIGH

    let westBound = widthOffset
    let eastBound = widthOffset + W_WIDTH
    let northBound = heighOffset
    let southBound = heighOffset + W_HEIGH

    const NECorner = new Point(eastBound, northBound)
    const SECorner = new Point(eastBound, southBound)
    const SWCorner = new Point(westBound, southBound)
    const NWCorner = new Point(westBound, northBound)

    let cp = new CloudPoints(POINT_QTY,
        0, eastBound + 2 * widthOffset,
        0, southBound + 2 * heighOffset
    ) // Draw arena = bounds + offset on each sides
    cp.canvas.ctx.scale(1, 1)
    
    time = new Date()

    let c = ['red', 'blue', 'green', 'green', 'green', 'green']
    //`hsl(${iteration / IT_MAX * 360}, 100%, 50%)`
    

    // I. MAKING POLYGONS
    for (let iteration = 0; iteration < IT_MAX; iteration++) {
        const isLastIT = iteration === IT_MAX - 1

        const triangulation = cp.DelaunayBowyerWatson(false, 'black')

        let voronoi = []

        for (let p of cp.points) {
            let poly = new PolygonVoronoi(p, cp)
            poly.BuildUp()
            voronoi.push(poly)
        }
        
        let points = new Array()
        for (let poly of voronoi) {
            if (poly.Close()) {
                poly.Lloyd()

            }

            points.push(new Point(poly.center.x, poly.center.y))
        }
        
        cp.points = points
    }

    console.log("I. 1st poly map, time :", Math.abs(time - (new Date())))


    // II. DEFINE WORLD TILES
    // 1. remove some points => merge some cells
    // const oldlatitudeRatios = {
    //     0 :1.0000,
    //     5 :0.9986,
    //     10:0.9954,
    //     15:0.9900,
    //     20:0.9822,
    //     25:0.9730,
    //     30:0.9600,
    //     35:0.9427,
    //     40:0.9216,
    //     45:0.8962,
    //     50:0.8679,
    //     55:0.8350,
    //     60:0.7986,
    //     65:0.7597,
    //     70:0.7186,
    //     75:0.6732,
    //     80:0.6213,
    //     85:0.5722,
    //     90:0.5322,
    // }
    const latitudeRatios = {
        0 :1.00,
        5 :0.99,
        10:0.97,
        15:0.95,
        20:0.90,
        25:0.85,
        30:0.79,
        35:0.72,
        40:0.66,
        45:0.56,
        50:0.45,
        55:0.34,
        60:0.23,
        65:0.12,
        70:0.10,
        75:0.08,
        80:0.02,
        85:0.02,
        90:0.02,
    }

    const halfWorldHeigh = W_HEIGH / 2
    const worldScale = 90; // half globe = 90°

    let flatWorldPoints = []
    for (let p of cp.points) {
        const pointHeighWithoutMargin = p.y - heighOffset
        const pointPositiveLatitude = Math.abs((pointHeighWithoutMargin - halfWorldHeigh) / halfWorldHeigh * worldScale); // (y-(h/2))/(h/2)*90°
        const latitudeToApply = 5 * Math.floor(pointPositiveLatitude / 5)
        const chanceToKeepPoint = latitudeRatios[latitudeToApply > 90 ? 90 : latitudeToApply]
        if(Math.random() < chanceToKeepPoint)
            flatWorldPoints.push(p)
        if(DEBUG_P2){
            console.log(pointHeighWithoutMargin)
            console.log(pointPositiveLatitude)
            console.log(latitudeToApply)
            console.log(chanceToKeepPoint)
        }
    }

    // 1.5. translate whole map
    if(CONF_shouldReplaceMapOnTopLeft){
        NECorner.Translate(-widthOffset, -heighOffset)
        NWCorner.Translate(-widthOffset, -heighOffset)
        SECorner.Translate(-widthOffset, -heighOffset)
        SWCorner.Translate(-widthOffset, -heighOffset)

        flatWorldPoints.forEach(p => p.Translate(-widthOffset, -heighOffset))

        westBound -= widthOffset
        eastBound -= widthOffset
        northBound -= heighOffset
        southBound -= heighOffset
    }
    // Draw map bounds
    cp.canvas.DrawStroke(NECorner, NWCorner, "grey", 1)
    cp.canvas.DrawStroke(SWCorner, NWCorner, "grey", 1)
    cp.canvas.DrawStroke(SWCorner, SECorner, "grey", 1)
    cp.canvas.DrawStroke(NECorner, SECorner, "grey", 1)

    // 2. render filtered points
    cp.points = flatWorldPoints
    const triangulation = cp.DelaunayBowyerWatson(false, 'black')
    let tiledWorld = []
    let neighbourhood = []
    for (let p of cp.points) {
        let poly = new PolygonVoronoi(p, cp)
        poly.BuildUp()
        tiledWorld.push(poly)
    }
    let fullWorldVoronoi = tiledWorld
    tiledWorld = fullWorldVoronoi
        .filter(poly => poly.center.x >= westBound && poly.center.x <= eastBound && poly.center.y >= northBound && poly.center.y <= southBound)
    tiledWorld.forEach(poly => cp.canvas.DrawPolygon(poly.edges, "blue", 2))

    console.log("II. 2nd poly map, time :", Math.abs(time - (new Date())))

    // 3. calculating neighbourhood
    let orphanEdges = []
    tiledWorld.forEach((poly, index) => {
        neighbourhood[index] = new Set()
        poly.edges.forEach((edge) => {
            let edgeSisterFound = false
            for(let i = 0; i < tiledWorld.length; i++) {
                // exclude self
                if(i === index)
                    continue

                const rPoly = tiledWorld[i]

                for(let j = 0; j < rPoly.edges.length; j++) {
                    if(areTwoEdgesSame(edge, rPoly.edges[j])){
                        edgeSisterFound = true
                        neighbourhood[index].add(i)
                        break
                    }
                }

                // this edge already has found his sister, no need for more iteration
                if(edgeSisterFound)
                    break
            }
            if(!edgeSisterFound)
                orphanEdges.push({polyIndex: index, edge: edge})
        })
    })
    if(DEBUG_P2){
        // black highlight east and west tiles (from orphan edges)
        orphanEdges.forEach(orphanEdge => cp.canvas.DrawPolygon(tiledWorld[orphanEdge.polyIndex].edges, "black", 5))
        // red highlight orphan edges
        orphanEdges.forEach(orphanEdge => cp.canvas.DrawStroke(orphanEdge.edge[0], orphanEdge.edge[1], "red", 5))
    }

    // 4. orphan edges, resolving east and west sides
    const directionTolerance = 0.05
    const tolerance = W_WIDTH * directionTolerance
    const westOrphanEdges = orphanEdges.filter(orphanEdge =>
        (orphanEdge.edge[0].x < westBound
            || orphanEdge.edge[1].x < westBound
        ) || isEdgeInBoundTolerance(orphanEdge.edge, westBound, tolerance))
    const eastOrphanEdges = orphanEdges.filter(orphanEdge =>
        (orphanEdge.edge[0].x > eastBound
            || orphanEdge.edge[1].x > eastBound
        ) || isEdgeInBoundTolerance(orphanEdge.edge, eastBound, tolerance))
    // DEBUG display frontier bounds
    // westOrphanEdges.forEach(orphanEdge => cp.canvas.DrawStroke(orphanEdge.edge[0], orphanEdge.edge[1], "red", 5))
    // eastOrphanEdges.forEach(orphanEdge => cp.canvas.DrawStroke(orphanEdge.edge[0], orphanEdge.edge[1], "red", 5))

    // west side
    westOrphanEdges.forEach((orphanEdge) => {
        const y1 = orphanEdge.edge[0].y
        const y2 = orphanEdge.edge[1].y
        for(let i = 0; i < eastOrphanEdges.length; i++) {
            const y3 = eastOrphanEdges[i].edge[0].y
            const y4 = eastOrphanEdges[i].edge[1].y
            if((y1 < y3 && y3 < y2)
                || (y1 < y4 && y4 < y2)
                || (y3 < y1 && y1 < y4)
                || (y3 < y2 && y2 < y4)

                || (y2 < y3 && y3 < y1)
                || (y2 < y4 && y4 < y1)
                || (y4 < y1 && y1 < y3)
                || (y4 < y2 && y2 < y3)
            ){
                neighbourhood[orphanEdge.polyIndex].add(eastOrphanEdges[i].polyIndex)
                // cp.canvas.DrawPolygon(tiledWorld[eastOrphanEdges[i].polyIndex].edges, "black", 3)
                break
            }
        }
    })
    // east side
    eastOrphanEdges.forEach((orphanEdge) => {
        const y1 = orphanEdge.edge[0].y
        const y2 = orphanEdge.edge[1].y
        for(let i = 0; i < westOrphanEdges.length; i++) {
            const y3 = westOrphanEdges[i].edge[0].y
            const y4 = westOrphanEdges[i].edge[1].y
            if((y1 < y3 && y3 < y2)
                || (y1 < y4 && y4 < y2)
                || (y3 < y1 && y1 < y4)
                || (y3 < y2 && y1 < y4)
            ){
                neighbourhood[orphanEdge.polyIndex].add(westOrphanEdges[i].polyIndex)
                // cp.canvas.DrawPolygon(tiledWorld[westOrphanEdges[i].polyIndex].edges, "black", 3)
                break
            }
        }
    })
    
    neighbourhood = neighbourhood.map(n => Array.from(n))
    // DEBUG show neighbourhood
    // neighbourhood.forEach((neighbours, index) => neighbours.forEach(neighbour => cp.canvas.DrawStroke(tiledWorld[index].center, tiledWorld[neighbour].center, "black", 2)))
    console.log("II. neighbourhood calculated, time :", Math.abs(time - (new Date())))


    // III. PLATES
    const tileToPlateRatio = 5
    const neighbouringFactorToSwap = 0.4
    const harmonizationQty = CONF_harmonizationQty || 2
    const wishedPlateQty = CONF_wishedPlateQty || 13

    let plateComponents = []
    // 1. Plate components
    for(let i = 0; i < tiledWorld.length / tileToPlateRatio; i++){
        plateComponents.push([[]])
        const indexToAdd = Math.floor(Math.random() * tiledWorld.length)
        plateComponents[i][0].push(indexToAdd)
        tiledWorld[indexToAdd].plateComponentId = i
    }
    let COUNTDOWN = 100
    // for each plateComponent, ring by ring try to add a neighbour
    while(tiledWorld.filter(tile => tile.plateComponentId == -1).length > 0 && COUNTDOWN > 0){
        COUNTDOWN --
        plateComponents.forEach((rings, index) => {
            let newTileAdded = false
            for(let h = 0; h < rings.length; h++){
                const ring = rings[h]
                // stop this plateComponent's expansion if outer ring is too small
                if(h > 1 && ring.length < 2)
                    break
                for(let i = 0; i < ring.length; i++){
                    const polyIndex = ring[i]
                    const neighbours = neighbourhood[polyIndex]
                    // add all non-atributed neighbours to the ring
                    neighbours.forEach((neighbour) => {
                        if(tiledWorld[neighbour].plateComponentId == -1){
                            tiledWorld[neighbour].plateComponentId = index
                            if(rings.length - 1 == h)
                                rings.push([])
                            rings[h+1].push(neighbour)
                            newTileAdded = true
                        }
                    })
                    if(newTileAdded) break
                }
                if(newTileAdded) break
            }
        })
    }

    plateComponents = plateComponents.map(p => p.flat(Infinity))

    // display plate components
    if(DEBUG_P3){
        console.log("plateComponents", plateComponents)
        // tiledWorld.forEach(tile => cp.canvas.DrawPixle(tile.center, COLOURS[tile.plateComponentId % COLOURS.length], tile.plateComponentId === -1 ? 0 : 20))
    }
    
    // 2. Generate Plates - seeds
    let plates = plateComponents.length < wishedPlateQty ? [...plateComponents] : []
    if(plates.length === 0){
        while(plates.length < wishedPlateQty){
            plates.push([...plateComponents[Math.floor(Math.random() * plateComponents.length)]])
            plates[plates.length -1].forEach(tileIndex => tiledWorld[tileIndex].plateId = plates.length -1)
        }
    }

    const swapTilePlateId = (tileIndex, newPlateId) => {
        const tile = tiledWorld[tileIndex]
        if(tile.plateId === -1 || !plates[tile.plateId])
            return
        const indexToRemove = plates[tile.plateId].indexOf(tileIndex)
        if(indexToRemove === -1)
            return
        plates[tile.plateId].splice(indexToRemove, 1)
        plates[newPlateId].push(tileIndex)
        tile.plateId = newPlateId
    }
    // 3. fill plates
    COUNTDOWN = 100
    while(tiledWorld.filter(tile => tile.plateId === -1).length > 0 && COUNTDOWN > 0){
        COUNTDOWN --
        plates.forEach((plate, plateIndex) => {
            let newTilesAdded = false
            const shuffledPlate = shuffle(plate)
            for(let i = 0; i < shuffledPlate.length; i++){
                const plateTileIndex = shuffledPlate[i]

                 for(let j = 0; j < neighbourhood[plateTileIndex].length; j++){
                    const neighbourIndex = neighbourhood[plateTileIndex][j]

                    if(tiledWorld[neighbourIndex].plateId === -1){
                        newTilesAdded = true

                        const tilesToAdd = plateComponents[tiledWorld[neighbourIndex].plateComponentId]
                        if(!tilesToAdd)
                            continue
                        plate.push(...tilesToAdd)
                        tilesToAdd.forEach(tileIndex => tiledWorld[tileIndex].plateId = plateIndex)
                    }

                    if(newTilesAdded) break
                }
                if(newTilesAdded) break
            }
        })
    }
    if(DEBUG_P3)
        console.log("countdown", COUNTDOWN)
    if(DEBUG_P3)
        console.log("plates, before harmonization", plates)

    // Harmonization
    for(let harmonizationCount = 0; harmonizationCount < harmonizationQty; harmonizationCount++){
        tiledWorld.forEach((tile, index) => {
            const neighbourPlateIds = neighbourhood[index].map(neighbourTileIndex => tiledWorld[neighbourTileIndex].plateId)
            for(let i = 0; i < neighbourPlateIds.length; i++){
                const testingPlateId = neighbourPlateIds[i]
                if(tile.plateId == testingPlateId)
                    continue
                const neighbourCount = neighbourPlateIds.reduce((acc, cur) => {return acc += (cur == testingPlateId)}, 0)
                if(neighbourCount > neighbourPlateIds.length * neighbouringFactorToSwap){
                    swapTilePlateId(index, testingPlateId)
                    break
                }

            }
        })
    }
    // display plates
    // tiledWorld.forEach(tile => cp.canvas.DrawPixle(tile.center, COLOURS[tile.plateId % COLOURS.length], tile.plateId === -1 ? 0 : 20))
    
    plateComponents = []
    console.log("III. Plates, time :", Math.abs(time - (new Date())))


    // IV - Terrain generation
    // initial setup
    const platesType = plates.map(tiles => {
        const isPlateOceanic = Math.random() < CONF_seaToLandRatio
        tiles.forEach(tileIndex => {
            tiledWorld[tileIndex].newHeight = isPlateOceanic ? CONF_baseWaterTileHeight : CONF_baseLandTileHeight
            tiledWorld[tileIndex].curHeight = isPlateOceanic ? CONF_baseWaterTileHeight : CONF_baseLandTileHeight
            tiledWorld[tileIndex].terrainType = isPlateOceanic ? TERRAINTYPES.water : TERRAINTYPES.land
        })
        return isPlateOceanic ? TERRAINTYPES.water : TERRAINTYPES.land
    })
    let platesDirection = plates.map(() => getRandomDirection())

    const filterNeighboursByDirection = (originTile, neighbours, wishedDirection, tolerance = 0) => {
        return neighbours.filter(neighbourIndex => {
            const neighbourTile = tiledWorld[neighbourIndex]
            const localDirection = getDirectionBetweenTiles(originTile, neighbourTile)
            return areDirectionsNearlyEqual(wishedDirection, localDirection, tolerance)
        })
    }

    const worldTectonic = () => {
        if(DEBUG_P4)
            console.log("plates direction", platesDirection)

        let tilesMarkedToSwap = []

        plates.forEach((tileIndexes, plateId) => {
            const plateDirection = platesDirection[plateId]
            const plateType = platesType[plateId]
            tileIndexes.forEach(tileIndex => {
                const tile = tiledWorld[tileIndex]

                // Searching neighbours following plate direction
                let frontingNeighbours = filterNeighboursByDirection(tile, neighbourhood[tileIndex], plateDirection, 0)
                if(frontingNeighbours.length <= 0){
                    frontingNeighbours = filterNeighboursByDirection(tile, neighbourhood[tileIndex], plateDirection, 1)
                    // if no neighbours found within 1 direction tolerance, skip this tile
                    if(frontingNeighbours.length <= 0)
                        return false
                }

                frontingNeighbours.forEach(neighbourTileIndex => {
                    const neighbour = tiledWorld[neighbourTileIndex]
                    const neighbourPlateId = neighbour.plateId
                    
                    //// neighbour is within same plate as curent tile
                    if(neighbourPlateId === plateId){
                        //TODO split curentHeigh between each frontier tiles
                        //TODO manage mountains merging witin the plate

                        // transfert tile height
                        if(/*neighbour.curHeight > CONF_seaLevel && */tile.curHeight <= CONF_seaLevel)
                            neighbour.newHeight = neighbour.curHeight + Math.floor((tile.curHeight - neighbour.curHeight) * 0.3)
                        else
                            neighbour.newHeight = tile.curHeight//neighbour.curHeight + Math.floor((tile.curHeight - neighbour.curHeight) * 1.0)
                        return true
                    }
                    
                    //// neighbour is in an other plate
                    // plate frontier management !
                    const neighbourPlateDirection = platesDirection[neighbourPlateId]
                    const neighbourPlateType = platesType[neighbourPlateId]

                    // if plates are following each other, swap plate and low chance of raising height
                    if(areDirectionsNearlyEqual(plateDirection, neighbourPlateDirection, 1)){
                        neighbour.newHeight = tile.curHeight
                        if(Math.random() < 0.1)
                            neighbour.newHeight += 5
                        tilesMarkedToSwap.push({tile: neighbourTileIndex, newPlateId: plateId})
                        return true
                    }

                    // if continental goes over oceanic, eat the oceanic one
                    if(plateType === TERRAINTYPES.land && neighbourPlateType === TERRAINTYPES.water){
                        neighbour.newHeight = tile.curHeight // transfert tile height
                        //TODO correct manage of subduction, slight increase of height
                        if(Math.random() < 0.8)
                            neighbour.newHeight += 30
                        tilesMarkedToSwap.push({tile: neighbourTileIndex, newPlateId: plateId})
                        return true
                    }

                    // if oceanic goes over continental that is above water, raise level, else, forget about it
                    if(plateType === TERRAINTYPES.water && neighbourPlateType === TERRAINTYPES.land && neighbour.curHeight < CONF_seaLevel){
                        // if colliding, moutains
                        if(areDirectionsOpposite(plateDirection, neighbourPlateDirection, 0)){
                            if(Math.random() < 0.8)
                                neighbour.newHeight = neighbour.curHeight + 20
                            return true
                        }
                        // if sliding, moutains (low)
                        if(areDirectionsOpposite(plateDirection, neighbourPlateDirection, 1)){
                            if(Math.random() < 0.8)
                                neighbour.newHeight = neighbour.curHeight + 10
                            return true
                        }
                    }
                    
                    // if same type of plate...
                    if(plateType === neighbourPlateType){
                        // if colliding, moutains
                        if(areDirectionsOpposite(plateDirection, neighbourPlateDirection, 0)){
                            if(Math.random() < 0.7)
                                neighbour.newHeight = neighbour.curHeight + 40
                            return true
                        }
                        // if sliding, moutains (low)
                        if(areDirectionsOpposite(plateDirection, neighbourPlateDirection, 1)){
                            if(Math.random() < 0.5)
                                neighbour.newHeight = neighbour.curHeight + 20
                            return true
                        }
                    }
                    
                })
                
            })
        })

        tilesMarkedToSwap.forEach(toSwap => swapTilePlateId(toSwap.tile, toSwap.newPlateId))
        
        // update all tiles
        tiledWorld.forEach(tile => {
            if(tile.newHeight != -1)
                tile.curHeight = tile.newHeight
            else
                tile.curHeight = Math.max(tile.curHeight - Math.floor(Math.random() * 10), 20)
            tile.newHeight = -1 //CONF_baseWaterTileHeight

            //TODO erosion, fake version
            // if(tile.curHeight > CONF_seaLevel + 30)
            if(tile.curHeight > 100)
                tile.curHeight -= Math.floor((tile.curHeight - CONF_seaLevel) * 0.075)

            // atribute new TERRAINTYPES according to tile height
            if(tile.curHeight < 0)
                tile.terrainType = TERRAINTYPES.undefined
            else if(tile.curHeight < CONF_seaLevel)
                tile.terrainType = TERRAINTYPES.water
            else if(tile.curHeight < CONF_mountainLevel)
                tile.terrainType = TERRAINTYPES.land
            else
                tile.terrainType = TERRAINTYPES.mountain
        })
    }


    
    for(let age = 0; age < CONF_worldAge; age++){
        displayTerrain(cp, tiledWorld, 20)
        // displayPlates(cp, tiledWorld, 4)
        platesDirection = platesDirection.map(direction => shiftDirectionRandom(direction, 0.02, 0.15))
        worldTectonic()
        // saveWorldAsImg()

        if(CONF_GIF_doSave)
            encoder.addFrame(context)
        if(DEBUG_P4)
            console.log(`IV. tectonic ITE ${age}, time :`, Math.abs(time - (new Date())))

        if(age +1 < CONF_worldAge)
            await sleep((1000 / CONF_simulation_fps) || 333)
    }

    console.log("IV. tectonic, time :", Math.abs(time - (new Date())))

    
    // save GIF
    if(CONF_GIF_doSave){
        encoder.finish()
        encoder.download(`thronus_map_${Date.now()}.gif`)
        console.log("saved GIF :", Math.abs(time - (new Date())))
    }

}

main(1280, 720,
    15000, 3,       // 14k pts, 3ité => +/- 48sec
    true,          // replace map on top left corner
    false,          // Phase 1
    false,          // Phase 2
    false, 19, 1,   // Phase 3
    false, .80, 42, 60, 140, 20, 80, 8, // Phase 4
    true, 8,  // GIF conf
)
