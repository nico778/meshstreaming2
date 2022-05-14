"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Halfedge = void 0;
class Halfedge {
    constructor() {
        this.idx = -1;
        this.onBoundary = false;
    }
    vector() {
        var _a, _b, _c;
        let a = (_a = this.vert) === null || _a === void 0 ? void 0 : _a.position;
        let b = (_c = (_b = this.twin) === null || _b === void 0 ? void 0 : _b.vert) === null || _c === void 0 ? void 0 : _c.position;
        let ev = b.sub(a);
        return ev;
    }
}
exports.Halfedge = Halfedge;
