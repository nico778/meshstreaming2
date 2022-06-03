import {Vector} from "./vector";
import {Vertex} from "./vertex";
import {Edge} from "./edge";
import {Face} from "./face";

export class Halfedge {
	rm: boolean;
    vert?: Vertex;
    edge?: Edge;
    face?: Face;
    prev?: Halfedge;
    next?: Halfedge;
    twin?: Halfedge;
    idx: number;
    onBoundary: boolean;
  
    constructor() {
			this.rm = false;
      this.idx = -1;
      this.onBoundary = false;
    }

    vector(): Vector {
      let a = this.vert?.position;
      let b = this.twin?.vert?.position;
      let ev = b!.sub(a!);
      return ev!;
    }
}