"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Face = void 0;
class Face {
    constructor() {
        this.idx = -1;
    }
    normal() {
        let a = this.halfedge.vector();
        //both vectors same direction
        let b = this.halfedge.prev.vector().scale(-1.0);
        let normal = a.cross(b).unit();
        return normal;
    }
}
exports.Face = Face;
