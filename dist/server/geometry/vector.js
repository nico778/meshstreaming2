"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Vector = exports.approxEqual = void 0;
function approxEqual(v1, v2, epsilon = 1e-7) {
    return Math.abs(v1 - v2) <= epsilon;
}
exports.approxEqual = approxEqual;
class Vector {
    constructor(x, y, z, w) {
        this.x = x || 0;
        this.y = y || 0;
        this.z = z || 0;
        this.w = w || 0;
    }
    add(v) {
        return new Vector(this.x + v.x, this.y + v.y, this.z + v.z, this.w + v.w);
    }
    sub(v) {
        return new Vector(this.x - v.x, this.y - v.y, this.z - v.z, this.w - v.w);
    }
    mult(v) {
        return new Vector(this.x * v.x, this.y * v.y, this.z * v.z, this.w * v.w);
    }
    div(v) {
        return new Vector(this.x / v.x, this.y / v.y, this.z / v.z, this.w / v.w);
    }
    eq(v) {
        if (approxEqual(this.x, v.x) &&
            approxEqual(this.y, v.y) &&
            approxEqual(this.z, v.z) &&
            approxEqual(this.w, v.w)) {
            return true;
        }
        return false;
    }
    dot(v) {
        return this.x * v.x + this.y * v.y + this.z * v.z + this.w * v.w;
    }
    cross(v) {
        let x = this.y * v.z - this.z * v.y;
        let y = this.z * v.x - this.x * v.z;
        let z = this.x * v.y - this.y * v.x;
        return new Vector(x, y, z, 0);
    }
    scale(s) {
        return new Vector(this.x * s, this.y * s, this.z * s, this.w * s);
    }
    norm() {
        return Math.sqrt(this.dot(this));
    }
    unit() {
        let n = this.norm();
        let u = new Vector();
        u.x = this.x / n;
        u.y = this.y / n;
        u.z = this.z / n;
        return u;
    }
}
exports.Vector = Vector;
