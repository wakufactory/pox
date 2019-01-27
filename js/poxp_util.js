//utils
//console panel
class Cpanel {
constructor(render,opt) {
	if(!opt) opt = {}
	if(opt.width===undefined) opt.width = 100 
	if(opt.height===undefined) opt.height = 50 
	if(opt.font===undefined) opt.font = "10px monospace"
	if(opt.color===undefined) opt.color = "red" 
	if(opt.lines===undefined) opt.lines = 5
	if(opt.lheight===undefined) opt.lheight = 10
	if(opt.ry===undefined) opt.ry = 40 
	if(opt.pos===undefined) opt.pos = [-0.3,0.3,-0.8]
	
	this.pcanvas = document.createElement('canvas') ;
	this.pcanvas.width = opt.width ;
	this.pcanvas.height = opt.height ;	
	this.j2c = new json2canvas(this.pcanvas)
	this.j2c.default.font = opt.font
	this.j2c.default.textColor = opt.color
	this.dd = []
	let y = opt.lheight 
	for(let i=0;i<opt.lines;i++,y+=opt.lheight) 
		this.dd.push({shape:"text",str:"",x:0,y:y,width:opt.width})
	this.j2c.draw(this.dd)	
		
	const ptex = {name:"cpanel",canvas:this.pcanvas,opt:{flevel:1,repeat:2,nomipmap:true}}
	render.addTex(ptex) 
	render.addModel(
		{geo:new WWModel().primitive("plane",{wx:opt.width/1000,wy:opt.height/1000
		}).objModel(),
			camFix:true,
			bm:new CanvasMatrix4().rotate(opt.ry,0,1,0).translate(opt.pos),
			blend:"alpha",
			vs_uni:{uvMatrix:[1,0,0, 0,1,0, 0,0,0]},
			fs_uni:{tex1:"cpanel",colmode:2,shmode:1}
		}
	)
}
update(render,text) {
	this.j2c.clear()
	for(let i=0;i<text.length;i++) 
		if(text[i]!==null) this.dd[i].str = text[i]
	this.j2c.draw(this.dd)
	render.updateTex("cpanel",this.pcanvas)	
}
}

// controller beam
class Beam {
constructor(render) {
	this.len = 200
	this.color = [1,1,0,1]
	this.cofs = [0.3,-0.5,0.2]
	this.vs = this.cofs.slice(0)
	this.ve = [this.len/2,this.len/2,-this.len]
	this.bv = [0,0,-1]

	render.addModel(
		{name:"beam",
		geo:{mode:"lines",
			vtx_at:["position"],
			vtx:this.vs.concat(this.ve)},
			fs_uni:{colmode:0,shmode:1,bcolor:this.color}}
	)
}
update(render,cam) {
	let bm = render.getModelData("beam")
	let vd = bm.geo.vtx
	let gp = POX.poxp.gPad
	if(gp && gp.pose) {
		this.ori=gp.pose.orientation
		let sx = this.cofs[0] * ((gp.hand=="right")?1:-1)
		let sy = this.cofs[1]
		let sz = this.cofs[2]
		let cq = Mat4.v2q(-cam.camRY,0,1,0) 
		let bm = new Mat4().q2m(
			Mat4.qMult(cq,this.ori) )
		bm.translate(cam.camCX,cam.camCY,cam.camCZ)
		this.vs = bm.multVec4(sx,0,sz,1)
		this.vs[1] = sy + cam.camCY
		this.ve = bm.multVec4(0,0,-this.len,1)
		this.bv = Mat4.V3norm(Mat4.V3sub(this.ve,this.vs))
		vd[0]=this.vs[0],vd[1]=this.vs[1],vd[2]=this.vs[2]
		vd[3]=this.ve[0],vd[4]=this.ve[1],vd[5]=this.ve[2]
		render.updateModel("beam","vbo",vd)
	}	
}
}

class Pool  {
	constructor() {
		this._use = [] 
		this._free = [] 
	}
	CreateInstance() {
		return {} 
	}
	InitInstance(obj) {
		return obj
	}
	Rent() {
		let obj 
		if(this._free.length>0) {
			obj = this._free[this._free.length-1]
			this._free.pop() 
		} else {
			obj = this.CreateInstance()
		}
		this.InitInstance(obj)
		this._use.push(obj)
		return obj
	}
	Return(obj) {
		for(let i in this._use) {
			if(this._use[i]===obj) {
				this._use.splice(i,1)
				break 
			}
		}
		this._free.push(obj)
	}
	Alloc(num) {
		for(let i=0;i<num;i++) this._free.push(this.CreateInstance())
	}
	GetInstances() {
		return this._use 
	}
}
