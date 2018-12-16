//utils
//console panel
class Cpanel {
constructor(render) {
	this.pcanvas = document.createElement('canvas') ;
	this.pcanvas.width = 100 ;
	this.pcanvas.height = 50 ;
	this.j2c = new json2canvas(this.pcanvas)
	this.j2c.default.font = "10px monospace"
	this.j2c.default.textColor = "red"
	this.dd = [
		{shape:"text",str:"",x:0,y:10,width:100},
		{shape:"text",str:"",x:0,y:20,width:100},
		{shape:"text",str:"",x:0,y:30,width:100},
		{shape:"text",str:"",x:0,y:40,width:100},
		{shape:"text",str:"",x:0,y:50,width:100}]
	this.j2c.draw(this.dd)	
		
	const ptex = {name:"cpanel",canvas:this.pcanvas,opt:{flevel:1,repeat:2,nomipmap:true}}
	render.addTex(ptex) 
	render.addModel(
		{geo:new WWModel().primitive("plane",{wx:0.1,wy:0.05
		}).objModel(),
			camFix:true,
			bm:new CanvasMatrix4().rotate(40,0,1,0).translate(-0.3,0.3,-0.8),
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
