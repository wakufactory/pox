importScripts('cubics.js','WWModel.js');
//worker
self.addEventListener('message', function(e) {
	var d = e.data ;
	var r = gen(d.nn,d.dd,d.lim,d.len,d.mag)
	self.postMessage(r);
}, false);

function gen(nn,dd,lim,len,mag) {
	var tl = [] ;
	for(let n=0;n<nn;n++) {
		var t = new TURTLE() ;
		tl[n] = t ;
		t.moveTo(0,0,0)
		for(let i=0;i<dd;i++) {
	//	var d = Math.floor(frand()*6)
			var d = Math.floor(frand()*6)
			t.color([1-n/nn,i/dd,0.5,1.0])
			switch(d) {
			case 0:
				t.smove((t.pos[0]>lim)?-1:1,0,0,len) ;
				break ;
			case 1:
				t.smove((t.pos[0]<-lim)?1:-1,0,0,len) ;
				break ;
			case 2:
				t.smove(0,(t.pos[1]>lim)?-1:1,0,len) ;
				break ;
			case 3:
				t.smove(0,(t.pos[1]<-lim)?1:-1,0,len) ;
				break ;
			case 4:
				t.smove(0,0,(t.pos[2]>lim)?-1:1,len) ;
				break ;
			case 5:
				t.smove(0,0,(t.pos[2]<-lim)?1:-1,len) ;
				break ;
			}
		}
	}
	var s = [] ;
	
	for(let i=0;i<dd*len;i++) {
		for(let n=0;n<nn;n++) {		
			s.push( tl[n].src.pos[i])
		}
	}
	/*
	for(let n=0;n<nn;n++) {
		for(let i=0;i<dd;i++) {		
			s.push( tl[n].src.pos[i])
		}
	}
	*/
	var cubes = new CUBICS(mag).setcube({pos:s}) ;
//	console.log(cubes)
	return cubes ;
}
