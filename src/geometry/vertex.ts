import {Vector} from "./vector";
import {Halfedge} from "./halfedge";
import {Face} from "./face";

export class Vertex {
	rm: boolean;
  position: Vector;
  halfedge?: Halfedge;
  uv?: Vector;
  idx: number;
  ecolError: number;
  ecolProspect?: Halfedge;
  minError: number;
  totalError: number;
  errorCount: number;

  constructor(position: Vector) {
		this.rm = false;
    this.position = position;
    this.idx = -1;
    this.ecolError = -1;
    this.minError = -1;
    this.totalError = -1;
    this.errorCount = -1;
    //this.ecolProspect = null;
  }

  delta() {
    return new Vector();
  }

  halfedges(fn: (h: Halfedge, i: number) => void) {
    let start = true;
    let i = 0;
    for(let h = this.halfedge; start || h !== this.halfedge; h = h!.twin!.next) {
      fn(h!, i);
      start = false;
      i++;
    }
  }

  faces(fn: (f: Face, i: number) => void) {
    let start = true;
    let i = 0;
    for(let h = this.halfedge; start || h !== this.halfedge; h = h!.twin!.next) {
      if(h!.onBoundary) {
        continue;
      }
      fn(h!.face!, i);
      start = false;
      i++;
    }
  }

  ecol_Error() {
    this.ecolError = 20;

    //find the outgoing halfedge with the lowest cost 
    this.halfedges(h => {
      let ecolError = this.h_ecolError(h);
      //no prospect for ecol found yet
      if(!this.ecolProspect) {
        this.ecolError = ecolError;
        this.minError = ecolError;
        this.ecolProspect = h;
        this.totalError = 0;
        this.errorCount = 0;
      }

      this.totalError+=ecolError;
      this.errorCount++;

      if(ecolError < this.minError) {
        this.ecolProspect = h;
        this.minError = ecolError;
      }
    });

    //average ecolError
		console.log(this.ecolError)
    this.ecolError = this.totalError / this.errorCount;
  }

  h_ecolError(h: Halfedge) {
    //error of collapsing halfedge this---h.next.vert
    //two faces on either side of the halfedge
    //select face with biggest distance from those two faces
    let heLen = h.vector().norm();
    let change = 0;

		/*let max = 0; 
		this.halfedges(h => {
			this.halfedge.next!.vert!.halfedges(h2 => {
				if(h.next!.vert! == h2.next!.vert!) {
					max++;
				}
			})
		})

		console.log(max);

		if(max !== 2) {
			return 100000;
		}*/
    
    this.faces(f => {
      let minChange = 1;

      h.next!.vert!.faces(f2 => {
        if(f == f2) {
          minChange = Math.min(minChange, (1 - (f.normal().dot(f.normal()))) / 2);
        }
      });

      change = Math.max(change, minChange);
    });

    return heLen * change;
  }
}