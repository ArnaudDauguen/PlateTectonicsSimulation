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

class PolygonVoronoi {
    constructor(center, cp) {
        this.center = center
        this.edges = []

        this.cp = cp

        this.closed = false
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

function main(shouldReplaceMapOnTopLeft = false, DEBUG_P1 = false, DEBUG_P2 = false, DEBUG_P3 = false) {
    const POINT_QTY = 7000
    const W_WIDTH = 1280
    const W_HEIGH = 720
    const IT_MAX = 3

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
    const oldlatitudeRatios = {
        0 :1.0000,
        5 :0.9986,
        10:0.9954,
        15:0.9900,
        20:0.9822,
        25:0.9730,
        30:0.9600,
        35:0.9427,
        40:0.9216,
        45:0.8962,
        50:0.8679,
        55:0.8350,
        60:0.7986,
        65:0.7597,
        70:0.7186,
        75:0.6732,
        80:0.6213,
        85:0.5722,
        90:0.5322,
    }
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
    if(shouldReplaceMapOnTopLeft){
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
    let worldVoronoi = []
    let neighbourhood = []
    for (let p of cp.points) {
        let poly = new PolygonVoronoi(p, cp)
        poly.BuildUp()
        worldVoronoi.push(poly)
    }
    let fullWorldVoronoi = worldVoronoi
    worldVoronoi = fullWorldVoronoi
        .filter(poly => poly.center.x >= westBound && poly.center.x <= eastBound && poly.center.y >= northBound && poly.center.y <= southBound)
    worldVoronoi.forEach(poly => cp.canvas.DrawPolygon(poly.edges, "blue", 2))

    console.log("II. 2nd poly map, time :", Math.abs(time - (new Date())))

    // 3. calculating neighbourhood
    let orphanEdges = []
    worldVoronoi.forEach((poly, index) => {
        neighbourhood[index] = new Set()
        poly.edges.forEach((edge) => {
            let edgeSisterFound = false
            for(let i = 0; i < worldVoronoi.length; i++) {
                // exclude self
                if(i === index)
                    continue

                const rPoly = worldVoronoi[i]

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
        orphanEdges.forEach(orphanEdge => cp.canvas.DrawPolygon(worldVoronoi[orphanEdge.polyIndex].edges, "black", 5))
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
                // cp.canvas.DrawPolygon(worldVoronoi[eastOrphanEdges[i].polyIndex].edges, "black", 3)
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
                // cp.canvas.DrawPolygon(worldVoronoi[westOrphanEdges[i].polyIndex].edges, "black", 3)
                break
            }
        }
    })
    
    neighbourhood = neighbourhood.map(n => Array.from(n))
    // DEBUG neighbouring frontier tiles
    // westOrphanEdges.forEach(orphanEdge => neighbourhood[orphanEdge.polyIndex].forEach(neighboorIndex => cp.canvas.DrawPixle(worldVoronoi[neighboorIndex].center, "green", 5)))
    // eastOrphanEdges.forEach(orphanEdge => neighbourhood[orphanEdge.polyIndex].forEach(neighboorIndex => cp.canvas.DrawPixle(worldVoronoi[neighboorIndex].center, "blue", 5)))
    // DEBUG show neighbourhood
    // neighbourhood.forEach((neighbours, index) => neighbours.forEach(neighbour => cp.canvas.DrawStroke(worldVoronoi[index].center, worldVoronoi[neighbour].center, "black", 2)))
    console.log("II. neighbourhood calculated, time :", Math.abs(time - (new Date())))


    // III. PLATE COMPONENTS
    // TODO
}

main(false, false, false, true)
