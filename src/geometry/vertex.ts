import {Vector} from "./vector";
import {Halfedge} from "./halfedge";
import {Face} from "./face";

export class Vertex {
	rm: boolean;
	manifold: boolean;
  position: Vector;
  halfedge?: Halfedge;
  uv?: Vector;
  idx: number;
  ecolError: number;
  ecolProspect: Vertex;
	ecolHalfedge: Halfedge;
  minError: number;
  totalError: number;
  errorCount: number;

  constructor(position: Vector) {
		this.rm = false;
		this.manifold = true;
    this.position = position;
    this.idx = -1;
    this.ecolError = -1;
    //this.minError = -1;
    //this.totalError = -1;
    //this.errorCount = -1;
    this.ecolProspect = null;
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
    this.ecolError = 100000;
		
    //find the outgoing halfedge with the lowest cost 
    this.halfedges(h => {
			
      let ecolError = this.h_ecolError(h);
      //no prospect for ecol found yet
      if(!this.ecolProspect) {
        this.ecolError = ecolError;
        this.minError = ecolError;
        this.ecolProspect = h.next!.vert;
				this.ecolHalfedge = h;
        this.totalError = 0;
        this.errorCount = 0;
      }

      this.totalError+=ecolError;
      this.errorCount++;

      if(ecolError < this.minError) {
        this.ecolProspect = h.next!.vert;
				this.ecolHalfedge = h;
        this.minError = ecolError;
      }
    });

    //average ecolError
    this.ecolError = this.totalError / this.errorCount;
  }

  h_ecolError(h: Halfedge) {
    //error of collapsing halfedge this---h.next.vert
    //two faces on either side of the halfedge
    //select face with biggest distance from those two faces
    let heLen = h.vector().norm();
    let change = 0;
		let incidentFaces = []; 

		incidentFaces.push(h!.face);
		incidentFaces.push(h!.twin!.face);
		
		let max = 0; 
		this.halfedges(he => {
			h.next!.vert.halfedges(he2 => {
				if(he.next!.vert!.idx === he2.next!.vert!.idx) {
					max++;
				}
			})
		})
    
    this.faces(f => { 

			if(f.idx !== incidentFaces[0].idx && f.idx !== incidentFaces[1].idx) {

				let minChange = 1;

				incidentFaces.forEach(i => {
					minChange = Math.min(minChange, (1 - (f.normal().dot(i.normal()))) / 2);
				});

			change = Math.max(change, minChange);

		}
    });

		if(max !== 2) {
			this.manifold = false;
		}

    return heLen * change;
  }
}