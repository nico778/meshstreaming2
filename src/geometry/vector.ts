export function approxEqual(v1: number, v2: number, epsilon = 1e-7): boolean {
  return Math.abs(v1 - v2) <= epsilon;
}
 
export class Vector {
  x: number;
  y: number;
  z: number;
  w: number;

  constructor(x?: number, y?: number, z?: number, w?: number) {
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
    this.w = w || 0;
  }

  add(v: Vector): Vector {
    return new Vector(this.x + v.x, this.y + v.y, this.z + v.z, this.w + v.w);
  }

  sub(v: Vector): Vector {
    return new Vector(this.x - v.x, this.y - v.y, this.z - v.z, this.w - v.w);
  }

  mult(v: Vector): Vector {
    return new Vector(this.x * v.x, this.y * v.y, this.z * v.z, this.w * v.w);
  }

  div(v: Vector): Vector {
    return new Vector(this.x / v.x, this.y / v.y, this.z / v.z, this.w / v.w);
  }

  eq(v: Vector): boolean {
    if (
      approxEqual(this.x, v.x) &&
      approxEqual(this.y, v.y) &&
      approxEqual(this.z, v.z) &&
      approxEqual(this.w, v.w)
    ) {
      return true;
    }
    return false;
  }
  
  dot(v: Vector): number {
    return this.x * v.x + this.y * v.y + this.z * v.z + this.w * v.w;
  }
  
  cross(v: Vector): Vector {
    let x = this.y * v.z - this.z * v.y;
    let y = this.z * v.x - this.x * v.z;
    let z = this.x * v.y - this.y * v.x;
    return new Vector(x, y, z, 0);
  }

  scale(s: number): Vector {
    return new Vector(this.x * s, this.y * s, this.z * s, this.w * s);
  }
  
  norm(): number {
    return Math.sqrt(this.dot(this));
  }
  
  unit(): Vector {
    let n = this.norm();
    let u = new Vector();
    u.x = this.x / n;
    u.y = this.y / n;
    u.z = this.z / n
    return u;
  }
}