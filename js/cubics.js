//CUBICS 
var CUBICS = function(mag) {
	this.mat= [1.0,1.0,1.0,1.0]
	this.attr = ["ipos","icolor"]
	this.atsize = 7
	this.mag = (mag)?mag:1
} ;
CUBICS.prototype.setcube = function(s) {
		var l = s.pos.length ;
		var r = new Float32Array(l * this.atsize ) ;
		var c = 0;
		for(var i=0;i<l;i++) {
			var p = s.pos[i] ;
			if(p[3]!==undefined) this.mat = p[3] ; 
			if(typeof this.mat == "string") this.mat = s.mat[this.mat] ;
			r[c++] = (p[0]*this.mag) ;
			r[c++] = (p[1]*this.mag) ;
			r[c++] = (p[2]*this.mag) ;
			r[c++] = (this.mat[0]) ;
			r[c++] = (this.mat[1]) ;
			r[c++] = (this.mat[2]) ;
			r[c++] = (this.mat[3]) ;
		}
		return {geo:new WWModel().primitive("box",{wx:0.5*this.mag,wy:0.5*this.mag,wz:0.5*this.mag}).objModel(),
			inst:{attr:this.attr,data:r,count:l}};
	}
CUBICS.prototype.update = function(src,time) {
		var l = src.pos.length ;
		for(let i=0;i<l;i++) {
			let p = src.pos[i] ;
			if(p[4]!=undefined) {
				let a = p[4];
				if(a.t===0) {
					src.pos[i][4].t = time ;
					src.pos[i][4].s = [p[0],p[1],p[2]];
					if(a.dir===undefined) src.pos[i][4].dir = 1 ;
				} else if( (time-a.t) < a.d*1000) {
					let tt = (time-a.t)/(a.d*1000) ;
					if(a.dir<0) tt = 1- tt ;
					src.pos[i][0] = a.s[0] + a.v[0]*tt ;
					src.pos[i][1] = a.s[1] + a.v[1]*tt ;
					src.pos[i][2] = a.s[2] + a.v[2]*tt ;
				} else {
					if(a.repeat) {
						let dd = ((time-a.t)- a.d*1000)%(a.d*1000) ;
						src.pos[i][4].t = time + dd;
						src.pos[i][4].dir = -a.dir ;
					}
				}
			}
		}
		var r = setcube(src) ;
		return r.inst ;
	}
	
//class turtle
var TURTLE = function() {
	this.pos = [0,0,0] ;
	this.col = "white" ;
	this.src = {
		mat:{
			"white":[1.0,1.0,1.0,1.0],
			"red":[1.0,0,0,1.0],
			"blue":[0,0,1.0,1.0]
		},
		pos:[] 
	}
}
TURTLE.prototype.set = function() {
	this.src.pos.push( [this.pos[0], this.pos[1], this.pos[2],this.col]) ;
}
TURTLE.prototype.move = function(x,y,z) {
	this.pos[0] += x ;
	this.pos[1] += y ;
	this.pos[2] += z ;
}
TURTLE.prototype.moveTo = function(x,y,z) {
	this.pos[0] = x ;
	this.pos[1] = y ;
	this.pos[2] = z ;
}
TURTLE.prototype.smove = function(x,y,z,l) {
	if(l===undefined) l = 1 ;
	for(let i=0;i<l;i++) {
		this.set(); 
		this.move(x,y,z) ;
	}
}
TURTLE.prototype.color = function(col) {
	this.col = col ;
}

var R = [Math.random(),Math.random(),Math.random(),Math.random()] ;
var RC = 0 ;
function frand() {
	let rr = (RC ^ ++RC) ;
	if(rr & 1) R[0] = Math.random() ;
	if(rr & 2) R[1] = Math.random() ;
	if(rr & 4) R[2] = Math.random() ;
	if(rr & 8) R[3] = Math.random() ;
	return (R[0]/8+R[1]/4+R[2]/2+R[3])%1.0 ;
//	return (Math.random()+Math.random()+Math.random()+Math.random())%1.0
}