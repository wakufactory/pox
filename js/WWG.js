//WWG Simple WebGL wrapper library
// Version 0.9 
// 2016-2017 wakufactory.jp 
// license: MIT 
// WWG
//   init(canvas)
//   init2(canvas)
//   loadAjax(src,opt)
//   loadImageAjax(src)
//   createRender()
// Render
//   setRender(scene)
//   draw(update,cls)
//   addModel(model)
//   updateModel(name,mode,buf)
//   addTex(texobj)
//   loadTex(tex)

function WWG() {
	this.version = "0.9.11" ;
	this.can = null ;
	this.gl = null ;
	this.vsize = {"float":1,"vec2":2,"vec3":3,"vec4":4,"mat2":4,"mat3":9,"mat4":16} ;
}
WWG.prototype.init = function(canvas,opt) {
	this.can = canvas ;
	let gl 
	if(!((gl = canvas.getContext("experimental-webgl",opt)) || (gl = canvas.getContext("webgl",opt)))) { return false } ;
	if(!window.Promise) return false ;
	this.gl = gl 
	this.ext_vao = gl.getExtension('OES_vertex_array_object');
	if(this.ext_vao) {
		this.vao_create = function(){return this.ext_vao.createVertexArrayOES()} ;
		this.vao_bind = function(o){this.ext_vao.bindVertexArrayOES(o)} ;
	}
	this.ext_inst = gl.getExtension('ANGLE_instanced_arrays');
	if(this.ext_inst) {
		this.inst_divisor = function(p,d){this.ext_inst.vertexAttribDivisorANGLE(p, d)}
		this.inst_draw = function(m,l,s,o,c){this.ext_inst.drawElementsInstancedANGLE(m,l, s, o, c);}
		this.inst_drawa = function(m,s,o,c) {this.ext_inst.drawArrayInstancedANGLE(m, s, o, c);}
	}
	this.ext_anis = gl.getExtension("EXT_texture_filter_anisotropic");
	this.ext_ftex = gl.getExtension('OES_texture_float');
	this.ext_mrt = gl.getExtension('WEBGL_draw_buffers');
	if(this.ext_mrt) {
		this.mrt_att = this.ext_mrt.COLOR_ATTACHMENT0_WEBGL ;
		this.mrt_draw = function(b,d){return this.ext_mrt.drawBuffersWEBGL(b,d)} ;
	}
	this.ext_i32 = gl.getExtension('OES_element_index_uint')
	this.ext_mv = gl.getExtension('WEBGL_multiview');
	if (this.ext_mv) 
        console.log("MULTIVIEW extension is supported");
	else {
		this.ext_mv = gl.getExtension('OVR_multiview');
		if (this.ext_mv)
			console.log("OVR MULTIVIEW extension is supported");
	} 
	this.dmodes = {"tri_strip":gl.TRIANGLE_STRIP,"tri":gl.TRIANGLES,"points":gl.POINTS,"lines":gl.LINES,"line_strip":gl.LINE_STRIP }
	this.version = 1 ;
	return true ;
}
WWG.prototype.init2 = function(canvas,opt) {
	this.can = canvas ;
	let gl 
	if(!((gl = canvas.getContext("experimental-webgl2",opt)) || (gl = canvas.getContext("webgl2",opt)))) { return false } ;
	if(!window.Promise) return false ;
	console.log("init for webGL2") ;
	this.gl = gl ;
	
	this.ext_vao = true ;
	this.vao_create = function(){ return this.gl.createVertexArray()} ;
	this.vao_bind = function(o){this.gl.bindVertexArray(o)} ;
	this.ext_inst = true ;
	this.inst_divisor = function(p,d){this.gl.vertexAttribDivisor(p, d)}
	this.inst_draw = function(m,l,s,o,c){this.gl.drawElementsInstanced(m,l, s, o, c);}
	this.inst_drawa = function(m,s,o,c) {this.gl.drawArraysInstanced(m, s, o, c);}
	this.ext_anis = gl.getExtension("EXT_texture_filter_anisotropic");
	if(this.ext_anis) this.ext_anis_max = gl.getParameter(this.ext_anis.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
	this.ext_ftex = true ;
	this.ext_mrt = (gl.getParameter(gl.MAX_DRAW_BUFFERS)>1) ;
	if(this.ext_mrt) {
		this.mrt_att = gl.COLOR_ATTACHMENT0 ;
		this.mrt_draw =  function(b,d){return gl.drawBuffers(b,d)} ;
	}
	this.ext_i32 = true ;
	this.ext_mv = gl.getExtension('WEBGL_multiview');
	if (this.ext_mv) 
        console.log("MULTIVIEW extension is supported");
	else {
		this.ext_mv = gl.getExtension('OVR_multiview');
		if (this.ext_mv)
			console.log("OVR MULTIVIEW extension is supported");
	} 
	this.dmodes = {"tri_strip":gl.TRIANGLE_STRIP,"tri":gl.TRIANGLES,"points":gl.POINTS,"lines":gl.LINES,"line_strip":gl.LINE_STRIP }
	this.version = 2 ;
	return true ;
}
WWG.prototype.loadAjax = function(src,opt) {
	return new Promise((resolve,reject)=> {
		const req = new XMLHttpRequest();
		req.open("get",src,true) ;
		req.responseType = (opt && opt.type)?opt.type:"text" ;
		req.onload = ()=> {
			if(req.status==200) {
				resolve(req.response) ;
			} else {
				reject("Ajax error:"+req.statusText) ;					
			}
		}
		req.onerror = ()=> {
			reject("Ajax error:"+req.statusText)
		}
		req.send() ;
	})
}
WWG.prototype.loadImageAjax = function(src) {
	return new Promise((resolve,reject)=>{
		this.loadAjax(src,{type:"blob"}).then((b)=>{
			const timg = new Image ;
			const url = URL.createObjectURL(b);
			timg.onload = ()=> {
				URL.revokeObjectURL(url)
				resolve(timg) ;
			}
			timg.src = url
		}).catch((err)=>{
			console.log(err)
			resolve(null) ;
		})
	})
}

// Render unit
WWG.prototype.createRender = function() {
	return new this.Render(this) ;
}
WWG.prototype.Render = function(wwg) {
	this.wwg = wwg ;
	this.gl = wwg.gl ;
	this.env = {} ;
//	this.obuf = [] ;
	this.modelCount = 0 ;
//	this.modelHash = {} ;
}
WWG.prototype.Render.prototype.setUnivec = function(uni,value) {
	if(uni.pos==null) return 
//	console.log("set "+uni.type+"("+uni.pos+") = "+value) ;
	let ar = [] ;
	if(uni.dim>0 && !(value instanceof Float32Array)) for(let i=0;i<uni.dim;i++) ar = ar.concat(value[i])
	else ar = value 
	if(uni.cache!=null) {
		if(Array.isArray(ar)) {
			for(let i=0;i<ar.length;i++) if(ar[i]!=uni.cache[i]) break ;
			if(i==ar.length) return ;
		} else if(ar == uni.cache) return ;
	}
//	console.log("set uni")
	switch(uni.type) {
		case "mat2":
			this.gl.uniformMatrix2fv(uni.pos,false,this.f32Array(value)) ;
			break ;
		case "mat3":
			this.gl.uniformMatrix3fv(uni.pos,false,this.f32Array(value)) ;
			break ;
		case "mat4":
			this.gl.uniformMatrix4fv(uni.pos,false,this.f32Array(value)) ;
			break ;
		case "vec2":
			this.gl.uniform2fv(uni.pos, this.f32Array(value)) ;
			break ;
		case "vec2v":
			this.gl.uniform2fv(uni.pos, this.f32Array(ar)) ;
			break ;
		case "vec3":
			this.gl.uniform3fv(uni.pos, this.f32Array(value)) ;
			break ;
		case "vec3v":
			this.gl.uniform3fv(uni.pos, this.f32Array(ar))
			break ;
		case "vec4":
			this.gl.uniform4fv(uni.pos, this.f32Array(value)) ;
			break ;
		case "vec4v":
			this.gl.uniform4fv(uni.pos, this.f32Array(ar)) ;
			break ;
		case "int":
		case "bool":
			this.gl.uniform1i(uni.pos,value) ;
			break ;
		case "ivec2":
		case "bvec2":
			this.gl.uniform2iv(uni.pos, this.i16Array(value)) ;
			break ;
		case "ivec2v":
		case "bvec2v":
			this.gl.uniform2iv(uni.pos, this.i16Array(ar)) ;
			break ;
		case "ivec3":
		case "bvec3":
			this.gl.uniform3iv(uni.pos, this.i16Array(value)) ;
			break ;
		case "ivec3v":
		case "bvec3v":
			this.gl.uniform3iv(uni.pos, this.i16Array(ar)) ;
			break ;
		case "ivec4":
		case "bvec4":
			this.gl.uniform4iv(uni.pos, this.i16Array(value)) ;
			break ;
		case "ivec4v":
		case "bvec4v":
			this.gl.uniform4iv(uni.pos, this.i16Array(ar)) ;
			break ;
		case "intv":
		case "boolv":
			this.gl.uniform1iv(uni.pos,this.i16Array(value)) ;
			break ;
		case "float":
			this.gl.uniform1f(uni.pos,value) ;
			break ;
		case "floatv":
			this.gl.uniform1fv(uni.pos,this.f32Array(value)) ;
			break ;
		case "sampler2D":
			if(typeof value == 'string') value = this.getTexIndex(value)
			this.gl.activeTexture(this.gl.TEXTURE0+uni.texunit);
			this.gl.bindTexture(this.gl.TEXTURE_2D, this.texobj[value]);
			if(this.data.texture[value]==undefined) break ;
			if(this.data.texture && this.data.texture[value].video) {
				this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.data.texture[value].video);	
			}
			this.gl.uniform1i(uni.pos,uni.texunit) ;
			break ;
	}
}

WWG.prototype.Render.prototype.setShader = function(data) {
	let tu = 0 ;
	function parse_shader(src) {
		const l = src.split("\n") ;
		const uni = [] ;
		const att = [] ;
		const def = {}

		for(i=0;i<l.length;i++) {
			let ln = l[i] ;
			if( ln.match(/^\s*#define\s*([^\s]+)\s+([^\s]+)/)) {
				def[RegExp.$1.trim()] = RegExp.$2.trim()
			}
			if( ln.match(/^\s*uniform\s*([0-9a-z]+)\s+([0-9a-z_]+)(\[[^\]]+\])?/i)) {
				let u = {type:RegExp.$1,name:RegExp.$2} ;
				if(RegExp.$3!="") {
					u.type = u.type+"v" ;
					let k = RegExp.$3.substr(1,RegExp.$3.length-2).trim()
					u.dim = parseInt(k) ;
					if(isNaN(u.dim)) u.dim = def[k]
				}
				if(u.type=="sampler2D") u.texunit = tu++ ;
				uni.push(u) ;
			}
			if( ln.match(/^\s*(?:attribute|in)\s+([0-9a-z]+)\s*([0-9a-z_]+)/i)) {
				att.push( {type:RegExp.$1,name:RegExp.$2}) ;
			}
		}
		return {uni:uni,att:att} ;
	}

	const gl = this.gl ;
	return new Promise((resolve,reject)=> {
		if(!data.vshader) { reject("no vshader") ;return false;}
		if(!data.fshader) { reject("no fshader") ;return false;}
		let vss ;
		let fss ;
		let pr = [] ;
		if(data.vshader.text ) vss = data.vshader.text ;
		else if(data.vshader.src) {
			pr.push( this.wwg.loadAjax(data.vshader.src).then((result)=> {
				vss = result ;
				resolve() ;
			}).catch((err)=> {
				reject(err) ;
			}))
		}
		if(data.fshader.text ) fss = data.fshader.text ;
		else if(data.fshader.src) {
			pr.push( this.wwg.loadAjax(data.fshader.src).then((result)=> {
				fss = result ;
				resolve() ;
			}).catch((err)=> {
				reject(err) ;
			}))
		}
		Promise.all(pr).then((res)=> {
//			console.log(vss) ;
//			console.log(fss) ;
			let ret = {} ;
			let vshader = gl.createShader(gl.VERTEX_SHADER);
			gl.shaderSource(vshader, vss);
			gl.compileShader(vshader);
			if(!gl.getShaderParameter(vshader, gl.COMPILE_STATUS)) {
				reject("vs error:"+gl.getShaderInfoLog(vshader)); return false;
			}
			ret.vshader = vshader ;
		
			let fshader = gl.createShader(gl.FRAGMENT_SHADER);
			gl.shaderSource(fshader, fss);
			gl.compileShader(fshader);
			if(!gl.getShaderParameter(fshader, gl.COMPILE_STATUS)) {
				reject("fs error:"+gl.getShaderInfoLog(fshader)); return false;
			}
			ret.fshader = fshader ;
			
			let program = gl.createProgram();
			gl.attachShader(program, vshader);
			gl.attachShader(program, fshader);
			gl.linkProgram(program);
			if(!gl.getProgramParameter(program, gl.LINK_STATUS)) {
				reject("link error:"+gl.getProgramInfoLog(program)); return false;
			}
			ret.program = program ;
			gl.useProgram(program);
		
			let vr = parse_shader(vss) ;	
//			console.log(vr) ;
			ret.vs_att = {} ;	
			for(let i in vr.att) {
				vr.att[i].pos = gl.getAttribLocation(program,vr.att[i].name) ;
				ret.vs_att[vr.att[i].name] = vr.att[i] ;
			}
			ret.vs_uni = {} ;
			for(let i in vr.uni) {
				vr.uni[i].pos = gl.getUniformLocation(program,vr.uni[i].name) ;
				vr.uni[i].cache = null 
				ret.vs_uni[vr.uni[i].name] = vr.uni[i] ;
			}
		
			let fr = parse_shader(fss) ;	
//			console.log(fr);	
			ret.fs_uni = {} ;
			for(let i in fr.uni) {
				fr.uni[i].pos = gl.getUniformLocation(program,fr.uni[i].name) ;
				fr.uni[i].cache = null 
				ret.fs_uni[fr.uni[i].name] = fr.uni[i] ;
			}
			resolve(ret) ;
		}).catch((err)=>{
			reject(err) ;
		}) ;
	})
}
WWG.prototype.Render.prototype.setUniValues = function(data) {
	if(data.vs_uni) {
		for(let i in data.vs_uni) {
			if(this.vs_uni[i]) {
				this.setUnivec(this.vs_uni[i], data.vs_uni[i]) ;
			}  ;
		}
	}
	if(data.fs_uni) {
		for(let i in data.fs_uni) {
			if(this.fs_uni[i]) {
				this.setUnivec(this.fs_uni[i], data.fs_uni[i]) ;
			}  ;
		}
	}
	return true ;
}
WWG.prototype.Render.prototype.genTex = function(img,option) {
	if(!option) option={flevel:0} ;
	let gl = this.gl ;
	const formatstr = {"rgb":gl.RGB,"gray":gl.LUMINANCE,"grayalpha":gl.LUMINANCE_ALPHA}
	let format = (option.format && formatstr[option.format])?formatstr[option.format]:gl.RGBA

	let tex = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, tex);
	if(option.isarray) {
		if(img instanceof Float32Array ) 
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, option.width,option.height,0,format, gl.FLOAT, img,0);
		else 
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, option.width,option.height,0,format, gl.UNSIGNED_BYTE, img);
		 option.flevel = 0 
		 option.nomipmap = true
	} else 	gl.texImage2D(gl.TEXTURE_2D, 0, format, format,gl.UNSIGNED_BYTE, img);

	if(!option.nomipmap) gl.generateMipmap(gl.TEXTURE_2D);
	//NEAREST LINEAR NEAREST_MIPMAP_NEAREST NEAREST_MIPMAP_LINEAR LINEAR_MIPMAP_NEAREST LINEAR_MIPMAP_LINEAR
	switch(option.flevel) {
	case 0:
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		break;
	case 1:
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		break;
	case 2:
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		break;
	}
	if(option.repeat==2) {
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	} else if(option.repeat==1) {
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);				
	} else {
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
	}
	if(this.wwg.ext_anis && option.anisotropy) {
		gl.texParameteri(gl.TEXTURE_2D, this.wwg.ext_anis.TEXTURE_MAX_ANISOTROPY_EXT, option.anisotropy);
	}
	gl.bindTexture(gl.TEXTURE_2D, null);	
	return tex ;	
}
WWG.prototype.Render.prototype.loadTex = function(tex) {
//	console.log( tex);
	let gl = this.gl ;

	return new Promise((resolve,reject)=> {
		if(tex.src) {
			if(tex.opt && tex.opt.cors) {
				this.wwg.loadImageAjax(tex.src).then((img)=>{
					resolve( this.genTex(img,tex.opt)) ;
				}).catch((err)=>reject(err));
			} else {
				let img = new Image() ;
				img.onload = ()=> {
					resolve( this.genTex(img,tex.opt) ) ;
				}
				img.onerror = ()=> {
					reject("cannot load image") ;
				}
				img.src = tex.src ;
			}
		} else if(tex.img instanceof Image) {
			resolve( this.genTex(tex.img,tex.opt) ) 
		} else if(tex.video ) {
			resolve( this.genTex(tex.video,{nomipmap:true,flevel:0,repeat:2}) ) 
		} else if(tex.buffer) {
			if(tex.mrt!=undefined) {
				resolve( tex.buffer.fb.t[tex.mrt])
			}
			else resolve( tex.buffer.fb.t) ;
		} else if(tex.texture) {
			resolve( tex.texture) ;
		} else if(tex.canvas) {
			resolve( this.genTex(tex.canvas,tex.opt)) ;
		} else if(tex.array) {
			tex.opt.isarray = true ;
			resolve( this.genTex(tex.array,tex.opt)) ;
		} else {
			reject("no image")
		}
	})
}
WWG.prototype.Render.prototype.getTexIndex = function(name) {
	if(!this.data.texture) return null 
	let i 
	for(i=0;i<this.data.texture.length;i++) {
		if(this.data.texture[i].name==name) break;
	}
	return (i==this.data.texture.length)?null:i
}
WWG.prototype.Render.prototype.addTex = function(texdata) {
	return new Promise((resolve,reject)=>{
		if(!this.data.texture) this.data.texture = []
		this.data.texture.push(texdata)
		this.loadTex(texdata).then((tex)=>{
			this.texobj.push(tex) ;
			resolve(this.texobj.length-1)
		}).catch((err)=>reject(err));
	})
}
WWG.prototype.Render.prototype.removeTex = function(tex) {
	if(typeof tex == "string") tex = this.getTexIndex(tex) 
	if(tex === null ) return 
	this.data.texture[tex] = null
	this.texobj[tex] = null 
}

WWG.prototype.Render.prototype.frameBuffer = function(os) {
	let gl = this.gl ;
	console.log("create framebuffer "+os.width+"x"+os.height) ;
	let mrt = os.mrt ;
	let ttype = gl.UNSIGNED_BYTE ;
	let tfilter = gl.LINEAR ;
	if(this.wwg.ext_ftex && os.float ) {
		ttype = gl.FLOAT ;
		tfilter = gl.NEAREST ;
		console.log("use float tex") ;
	}
	let fblist = [] ;
	let frameBuffer = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
	//depth
	let renderBuffer = gl.createRenderbuffer();
	gl.bindRenderbuffer(gl.RENDERBUFFER, renderBuffer);
	gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, os.width, os.height);	
	gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderBuffer);
	//texture
	if(mrt) {
		let fTexture = [] ;
		for(let i=0;i<mrt;i++) {
			fTexture[i] = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, fTexture[i]);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, os.width, os.height, 0, gl.RGBA, ttype, null);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, tfilter);
		    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, tfilter);
			gl.framebufferTexture2D(gl.FRAMEBUFFER, this.wwg.mrt_att + i, gl.TEXTURE_2D, fTexture[i], 0);	
			fblist.push(this.wwg.mrt_att + i)		
		}
	} else {
		let fTexture = gl.createTexture()
		gl.bindTexture(gl.TEXTURE_2D, fTexture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, os.width, os.height, 0, gl.RGBA, ttype, null);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, tfilter);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, tfilter);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fTexture, 0);
	}
	gl.bindTexture(gl.TEXTURE_2D, null);
	gl.bindRenderbuffer(gl.RENDERBUFFER, null);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);	

	let ret = {ox:os.offsetX,oy:os.offsetY,width:os.width,height:os.height,f:frameBuffer,d:renderBuffer,t:fTexture}
	if(mrt) ret.fblist = fblist ;
	return ret ;
}
WWG.prototype.Render.prototype.setRender =function(data) {
	let gl = this.gl ;
	this.env = data.env ;
	this.data = data ;

	return new Promise((resolve,reject)=> {
		if(!gl) { reject("no init") ;return ;}
		let pr = [] ;
		this.setShader({fshader:data.fshader,vshader:data.vshader}).then((ret)=> {
			//set program
			this.vshader = ret.vshader ;
			this.fshader = ret.fshader ;
			this.program = ret.program ;
			this.vs_uni = ret.vs_uni ;
			this.vs_att = ret.vs_att ;
			this.fs_uni = ret.fs_uni ;
			
			// load textures
			if(data.texture) {
				for(let i=0;i<data.texture.length;i++) {
					pr.push(this.loadTex( data.texture[i])) ;
				}
			}

			Promise.all(pr).then((result)=> {
//				console.log(result) ;
				this.texobj = result ;
				// set initial values
				if(!this.setUniValues(data)) {
					reject("no uniform name") ;
					return ;
				}
				
				if(this.env.cull) gl.enable(gl.CULL_FACE); else gl.disable(gl.CULL_FACE);
				if(this.env.face_cw) gl.frontFace(gl.CW); else gl.frontFace(gl.CCW);
				if(!this.env.nodepth) gl.enable(gl.DEPTH_TEST); else gl.disable(gl.DEPTH_TEST);		
		
				//set model 
				for(let i =0;i<data.model.length;i++) {
					data.model[i].obuf = this.setObj( data.model[i],true) ;
//					if(data.model[i].name) this.modelHash[data.model[i].name] = data.model[i] ;
				}
				this.modelCount = data.model.length ;
//				console.log(this.obuf);
				
				if(this.env.offscreen) {// renderbuffer 
					if(this.env.offscreen.mrt) { //MRT
						if(!this.wwg.ext_mrt) reject("MRT not support") ;
					}
					this.fb = this.frameBuffer(this.env.offscreen) ;	
				}
				resolve(this) ;
				
			}).catch((err)=> {
				reject(err) ;
			})
		}).catch((err)=> {reject(err);})
	});
}

WWG.prototype.Render.prototype.clear = function() {
	let cc = this.env.clear_color ;
	this.gl.clearColor(cc[0],cc[1],cc[2],cc[3]);
	this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
}

WWG.prototype.Render.prototype.f32Array = function(ar) {
	if(ar instanceof Float32Array) return ar ;
	else return new Float32Array(ar) ;
}
WWG.prototype.Render.prototype.i16Array = function(ar) {
	if(ar instanceof Int16Array) return ar ;
	else return new Int16Array(ar) ;
}
WWG.prototype.Render.prototype.i32Array = function(ar) {
	if(ar instanceof Uint32Array) return ar ;
	else return new Uint32Array(ar) ;
}
WWG.prototype.Render.prototype.setObj = function(obj,flag) {
	let gl = this.gl
	let geo = obj.geo ;
	let inst = obj.inst ;
	ret = {} ;
	let vao
	if(this.wwg.ext_vao) {
		vao = this.wwg.vao_create() ;
		this.wwg.vao_bind(vao);
		ret.vao = vao ;
	}
	
	let vbo = gl.createBuffer() 
	gl.bindBuffer(gl.ARRAY_BUFFER, vbo) ;

	let tl = 0 ;
	let ats = [] ;
	for(let i=0;i<geo.vtx_at.length;i++) {
		ats.push( this.vs_att[geo.vtx_at[i]] ) ;
		tl += this.wwg.vsize[this.vs_att[geo.vtx_at[i]].type] ;
	}

	ret.ats = ats ;
	ret.tl = tl ;
	let ofs = 0 ;
	for(let i in this.vs_att ) {
		if(this.vs_att[i].pos>=0) gl.disableVertexAttribArray(this.vs_att[i].pos);
	}
	for(let i=0;i<ats.length;i++) {
		let s = this.wwg.vsize[ats[i].type] ;
		gl.enableVertexAttribArray(this.vs_att[ats[i].name].pos);
		gl.vertexAttribPointer(this.vs_att[ats[i].name].pos, s, gl.FLOAT, false, tl*4, ofs);
		ofs += s*4 ;	
	} 	
	ret.vbo = vbo ;
	let ibo
	if(geo.idx) {
		ibo = gl.createBuffer() ;
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo) ;
		ret.ibo = ibo ;
	}
	let ibuf 
	if(inst) {
		ibuf = gl.createBuffer() 
		gl.bindBuffer(gl.ARRAY_BUFFER, ibuf) ;
		let tl = 0 ;
		let ats = [] ;
		for(let i=0;i<inst.attr.length;i++) {
			ats.push( this.vs_att[inst.attr[i]] ) ;
			tl += this.wwg.vsize[this.vs_att[inst.attr[i]].type] ;
		}
		tl = tl*4 ;
		ret.iats = ats ;
		ret.itl = tl ;
		let ofs = 0 ;
		for(let i=0;i<ats.length;i++) {
			let divisor = (inst.divisor)?inst.divisor[i]:1 ;
			let s = this.wwg.vsize[ats[i].type] ;
			let pos = this.vs_att[ats[i].name].pos
			gl.enableVertexAttribArray(pos);
			gl.vertexAttribPointer(pos, s, gl.FLOAT, false, tl, ofs);
			ofs += s*4 ;
			this.wwg.inst_divisor(pos, divisor)	
		} 
		ret.inst = ibuf 
	}
	
	if(this.wwg.ext_vao) this.wwg.vao_bind(null);

	if(this.wwg.ext_vao) this.wwg.vao_bind(vao);
	if(flag) {
		gl.bindBuffer(gl.ARRAY_BUFFER, vbo) ;
		gl.bufferData(gl.ARRAY_BUFFER, 
			this.f32Array(geo.vtx), (geo.dynamic)?gl.DYNAMIC_DRAW:gl.STATIC_DRAW) ;
	}
	if(flag && geo.idx) {
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo) ;
		if(geo.vtx.length/(ret.tl) > 65536 && this.wwg.ext_i32) {
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, 
				this.i32Array(geo.idx),gl.STATIC_DRAW ) ;
			ret.i32 = true ;
		} else {
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, 
				this.i16Array(geo.idx),gl.STATIC_DRAW ) ;
			ret.i32 = false ;
		}
	}
	if(flag && inst) {
		gl.bindBuffer(gl.ARRAY_BUFFER, ibuf) ;
		gl.bufferData(gl.ARRAY_BUFFER, 
			this.f32Array(inst.data),(inst.dynamic)?gl.DYNAMIC_DRAW:gl.STATIC_DRAW ) ;
	}
	if(this.wwg.ext_vao) this.wwg.vao_bind(null);
		
	return ret ;
}
WWG.prototype.Render.prototype.getModels = function() {
	return this.data.model.filter((m)=>(m!==null))	
}
WWG.prototype.Render.prototype.getModelIdx = function(name) {
	let idx = false 
	if(typeof name != 'string') idx = parseInt(name) ;
	else {
		for(let i=0;i<this.data.model.length;i++) 	{
			if(this.data.model[i]===null) continue 
			if(name==this.data.model[i].name) {idx = i ;break }
		}
	}
	return idx ;	
}
// add model
WWG.prototype.Render.prototype.addModel = function(model) {
	let idx = false
	if(model.name) idx = this.getModelIdx(model.name)
	if(idx!==false ) {
		this.data.model[idx] = model ;
		this.data.model[idx].obuf = this.setObj(model,true) ;
		return 
	}
	this.data.model.push(model) ;
	this.data.model[this.data.model.length-1].obuf = this.setObj(model,true) ;
	this.modelCount++
//	if(model.name) this.modelHash[model.name] = this.data.model.length -1 ;
}
// remove model
WWG.prototype.Render.prototype.removeModel = function(model) {
	let mi = this.getModelIdx(model) 
	if(mi===false) return false 
//	delete this.modelHash[this.data.model[mi].name] 
	this.data.model[mi].obuf = null 
	this.data.model[mi] = null 
	this.modelCount--  
	return true 
}
// update attribute buffer 
WWG.prototype.Render.prototype.updateModel = function(name,mode,buf,subflag=true) {
	let idx = this.getModelIdx(name) ;
	let obuf = this.data.model[idx].obuf ;
	switch(mode) {
		case "vbo":	
			this.gl.bindBuffer(this.gl.ARRAY_BUFFER, obuf.vbo) ;
			break ;
		case "inst":
			this.gl.bindBuffer(this.gl.ARRAY_BUFFER, obuf.inst) ;
			break ;
	}
	if(subflag) 
		this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.f32Array(buf))	
	else
		this.gl.bufferData(this.gl.ARRAY_BUFFER, this.f32Array(buf),this.gl.DYNAMIC_DRAW ) ;
}
WWG.prototype.Render.prototype.updateModelInstance = function(name,buf,count) {
	let idx = this.getModelIdx(name) ;
	let obuf = this.data.model[idx].obuf ;
	this.data.model[idx].inst.count = count ;
	this.gl.bindBuffer(this.gl.ARRAY_BUFFER, obuf.inst) ; 
//		this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.f32Array(buf))	
		this.gl.bufferData(this.gl.ARRAY_BUFFER, this.f32Array(buf),this.gl.DYNAMIC_DRAW ) ;
}
WWG.prototype.Render.prototype.getModelData =function(name) {
	let idx = this.getModelIdx(name) ;
	return this.data.model[idx] ;
}
// update texture 
WWG.prototype.Render.prototype.updateTex = function(idx,tex,opt) {
	if(typeof idx == 'string') idx = this.getTexIndex(idx)
	var tdat = this.data.texture[idx]
	this.gl.bindTexture(this.gl.TEXTURE_2D, this.texobj[idx]);

	if(tdat.array) {
		if(!opt) 
			if(tdat.array instanceof Float32Array ) 
				this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA16F, 
				tdat.opt.width,tdat.opt.height,0,this.gl.RGBA, this.gl.FLOAT, tex);
			else
				this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, 
				tdat.opt.width,tdat.opt.height,0,this.gl.RGBA, this.gl.UNSIGNED_BYTE, tex);	
		else 
			if(tdat.array instanceof Float32Array ) 
				this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, 
				opt.sx,opt.sy,opt.width,opt.height,this.gl.RGBA, this.gl.FLOAT, tex,opt.ofs);
			else
				this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, 
				opt.sx,opt.sy,opt.width,opt.height,this.gl.RGBA, this.gl.UNSIGNED_BYTE, tex,opt.ofs);
	} else {
		if(!opt) {
			this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, tex);
		} else {
			if(opt.wx>0 && opt.wy>0)
				this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, opt.sx,opt.sy,opt.wx,opt.wy,this.gl.RGBA, this.gl.UNSIGNED_BYTE, tex);	
			else 	
				this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, opt.sx,opt.sy , this.gl.RGBA, this.gl.UNSIGNED_BYTE, tex);
		}
	}
	if(tdat.opt && !tdat.opt.nomipmap) this.gl.generateMipmap(this.gl.TEXTURE_2D);
}
//update uniform values
WWG.prototype.Render.prototype.pushUniValues = function(u) {
	if(u.vs_uni) {
		for(let i in u.vs_uni) {
			this.update_uni.vs_uni[i] = u.vs_uni[i] ;
		}
	}
	if(u.fs_uni) {
		for(let i in u.fs_uni) {
			this.update_uni.fs_uni[i] = u.fs_uni[i] ;
		}
	}
}
WWG.prototype.Render.prototype.updateUniValues = function(u) {
	if(!u) {
		this.update_uni = {vs_uni:{},fs_uni:{}} ;
		return ;
	}
//	console.log("update uni");
	this.setUniValues(this.update_uni)
}

// draw call
WWG.prototype.Render.prototype.draw = function(update,cls) {
//console.log("draw");

	let gl = this.gl ;
	gl.useProgram(this.program);
	if(this.env.offscreen) {// renderbuffer 
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb.f);
		if(this.env.offscreen.mrt) this.wwg.mrt_draw(this.fb.fblist);
		gl.viewport(fb.offsetX,fb.offsetY,this.fb.width,this.fb.height) ;
	}
	if(!cls) this.clear() ;
	let models = this.data.model
	for(let b=0;b<models.length;b++) {
		if(models[b]===null) continue 
		let cmodel = models[b] ;
		if(cmodel.hide) continue ;
		if(cmodel.obuf==null) continue ;

		let geo = cmodel.geo ;
		this.updateUniValues(0) ;
		this.pushUniValues(this.data) ;
		this.pushUniValues(cmodel);
		if(update) {
			// set modified values
			if(!Array.isArray(update)) update = [update ]
			for(let i=0;i<update.length;i++) {
				this.pushUniValues(update[i]) ;
				if(update[i].model) {
					let model =update[i].model[b] ;
					if(model) this.pushUniValues(model) ;
				}
			}
		}
		this.updateUniValues(1)

		let obuf = cmodel.obuf ;
		let ofs = (geo.ofs>0)?geo.ofs:0 ;
		if(this.wwg.ext_vao)  this.wwg.vao_bind(obuf.vao);
		else {
			gl.bindBuffer(gl.ARRAY_BUFFER, obuf.vbo) ;
			let aofs = 0 ;
			for(let i in this.vs_att ) {
				gl.disableVertexAttribArray(this.vs_att[i].pos);
			}
			for(let i=0;i<obuf.ats.length;i++) {
				let s = this.wwg.vsize[obuf.ats[i].type] ;
				gl.enableVertexAttribArray(this.vs_att[obuf.ats[i].name].pos);
				gl.vertexAttribPointer(this.vs_att[obuf.ats[i].name].pos, s, gl.FLOAT, false, obuf.tl*4, aofs);
				aofs += s*4 ;	
			}
			if(obuf.ibo) gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obuf.ibo) ;
			if(obuf.inst) {
				let inst = cmodel.inst ;
				gl.bindBuffer(gl.ARRAY_BUFFER, obuf.inst) ;
				let aofs = 0 ;
				for(let i=0;i<obuf.iats.length;i++) {
					let divisor = (inst.divisor)?inst.divisor[i]:1 ;
					let s = this.wwg.vsize[obuf.iats[i].type] ;
					let pos = this.vs_att[obuf.iats[i].name].pos
					gl.enableVertexAttribArray(pos);
					gl.vertexAttribPointer(pos, s, gl.FLOAT, false, obuf.itl, aofs);
					aofs += s*4 ;
					this.wwg.inst_divisor(pos, divisor)		
				}
			}
		}
		if(cmodel.preFunction) {
			
			cmodel.preFunction(gl,cmodel,obuf) ;
		}
		if(cmodel.blend!==undefined) {
			gl.enable(gl.BLEND) ;
			if(cmodel.blend=="alpha") gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE);
		}
		if(cmodel.cull!==undefined) {
			if(cmodel.cull) gl.enable(gl.CULL_FACE); else gl.disable(gl.CULL_FACE);
		}
		let gmode = this.wwg.dmodes[geo.mode]
		if(gmode==undefined) {
				console.log("Error: illigal draw mode") ;
				return false ;
		}
		if(cmodel.inst) {
			if(geo.idx) this.wwg.inst_draw(gmode, geo.idx.length, (obuf.i32)?gl.UNSIGNED_INT:gl.UNSIGNED_SHORT, ofs, cmodel.inst.count);
			else this.wwg.inst_drawa(gmode, ofs,(geo.count>0)?geo.count:geo.vtx.length/obuf.tl, cmodel.inst.count);
		} else {
			if(geo.idx) gl.drawElements(gmode, geo.idx.length, (obuf.i32)?gl.UNSIGNED_INT:gl.UNSIGNED_SHORT, ofs);
			else gl.drawArrays(gmode, ofs,
				(geo.count>0)?geo.count:geo.vtx.length/obuf.tl);
		}
		if(this.wwg.ext_vao) this.wwg.vao_bind(null);
		else {
			
		}
		if(cmodel.blend!==undefined) {
			gl.disable(gl.BLEND) ;
		}
		if(cmodel.cull!==undefined) {
			if(this.env.cull) gl.enable(gl.CULL_FACE); else gl.disable(gl.CULL_FACE);
		}
		if(cmodel.postFunction) {
			cmodel.postFunction(gl,cmodel) ;
		}
	}
	if(this.env.offscreen) {// unbind renderbuffer 
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.viewport(0,0,this.wwg.can.width,this.wwg.can.height) ;
	}
	return true ;
}