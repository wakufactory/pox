class Vector extends Array {
	constructor(...args) {
		let v = args 
		if(Array.isArray(args[0])) v = args[0]
		super(...v)
		this._setxyz()
	}
	_setxyz() {
		this.x = this[0]
		if(this[1]!==undefined) this.y = this[1]
		if(this[2]!==undefined) this.z = this[2] 
		if(this[3]!==undefined) this.w = this[3]	
	}
	set x(v) {this._x = v,this[0] = v}
	set y(v) {this._y = v,this[1] = v}
	set z(v) {this._z = v,this[2] = v}
	set w(v) {this._w = v,this[3] = v}
	set r(v) {this._x = v,this[0] = v}
	set g(v) {this._y = v,this[1] = v}
	set b(v) {this._z = v,this[2] = v}
	set a(v) {this._w = v,this[3] = v}
	get x() { return this._x}
	get y() { return this._y}
	get z() { return this._z}
	get w() { return this._w}
	get r() { return this._x}
	get g() { return this._y}
	get b() { return this._z}
	get a() { return this._w}
//retrun new vector
	get xy() { return new Vector(this[0],this[1])}
	get yx() { return new Vector(this[1],this[0])}
	get xz() { return new Vector(this[0],this[2])}
	get zx() { return new Vector(this[2],this[0])}
	get yz() { return new Vector(this[1],this[2])}
	get zy() { return new Vector(this[2],this[1])}
	get xyz() { return new Vector(this[0],this[1],this[2])}
	get xzy() { return new Vector(this[0],this[2],this[1])}
	get yxz() { return new Vector(this[1],this[0],this[2])}
	get yzx() { return new Vector(this[1],this[2],this[0])}
	get zxy() { return new Vector(this[2],this[0],this[1])}
	get zyx() { return new Vector(this[2],this[1],this[0])}
	get rgb() { return new Vector(this[0],this[1],this[2])}

	cross(vec) {
		if(this.length!=3 || vec.length!=3 ) throw -1 
		let r = [
			this[1]*vec[2] - this[2] * vec[1],
			this[2]*vec[0] - this[0] * vec[2],
			this[0]*vec[1] - this[1] * vec[0] 
			]
		return new Vector(r) 
	}
	mix(vec ,ratio ) {
		return new Vector(this.map((v,i)=>v*(1-ratio)+vec[i]*ratio)) 
	}

	invert() {
		return new Vector(this.map(v=>-v)) 
	}
	add(tgt) {
		if(!Array.isArray(tgt)) tgt = new Array(this.length).fill(tgt)
		if(this.length!=tgt.length) throw -1
		return new Vector(this.map((v,i)=>v+tgt[i])) 
	}
	sub(tgt) {
		if(!Array.isArray(tgt)) tgt = new Array(this.length).fill(tgt)
		if(this.length!=tgt.length) throw -1
		return new Vector(this.map((v,i)=>v-tgt[i])) 
	}
	mult(tgt ) {
		if(!Array.isArray(tgt)) tgt = new Array(this.length).fill(tgt)
		return new Vector(this.map((v,i)=>v*tgt[i])) 	
	}
	normalize() {
		let l = this.hypot() 
		return new Vector(this.map((v,i)=>(l!=0)?v/l:0)) 
	}
	floor() {
		return new Vector(this.map((v,i)=>Math.floor(v))) 	
	}
	ceil() {
		return new Vector(this.map((v,i)=>Math.ceil(v))) 		
	}
	fract() {
		return new Vector(this.map((v,i)=>v-Math.floor(v))) 		
	}
	min(tgt ) {
		if(!Array.isArray(tgt)) tgt = new Array(this.length).fill(tgt)
		return new Vector(this.map((v,i)=>(v<tgt[i])?v:tgt[i])) 			
	}
	max(tgt ) {
		if(!Array.isArray(tgt)) tgt = new Array(this.length).fill(tgt)
		return new Vector(this.map((v,i)=>(v>tgt[i])?v:tgt[i])) 			
	}
	clamp(min,max) {
		return new Vector(this.map((v,i)=>(v<min)?min:(v>max)?max:v)) 			
	}
	step(th) {
		return new Vector(this.map((v,i)=>(v<th)?0:1)) 			
	}
	mod(a) {
		return new Vector(this.map((v,i)=>v % a)) 		
	}
//return float
	dot(vec) {
		return this.reduce((a,v,i)=>a+=v*vec[i],0)
	}
	distance(vec) {
		let v = new Vector(...this)
		return v.sub(vec).hypot()
	}
	hypot() {
		return Math.hypot(...this)
	}
// return bool
	equal(vec) {
		return this.reduce((a,v,i)=>a && v===vec[i],true)
	}
}