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
	this.version = "0.9.1" ;
	this.can = null ;
	this.gl = null ;
	this.vsize = {"float":1,"vec2":2,"vec3":3,"vec4":4,"mat2":4,"mat3":9,"mat4":16} ;
}
WWG.prototype.init = function(canvas,opt) {
	this.can = canvas ;
	var gl 
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

	this.dmodes = {"tri_strip":gl.TRIANGLE_STRIP,"tri":gl.TRIANGLES,"points":gl.POINTS,"lines":gl.LINES,"line_strip":gl.LINE_STRIP }
	this.version = 1 ;
	return true ;
}
WWG.prototype.init2 = function(canvas,opt) {
	this.can = canvas ;
	var gl 
	if(!((gl = canvas.getContext("experimental-webgl2",opt)) || (gl = canvas.getContext("webgl2",opt)))) { return false } ;
	if(!window.Promise) return false ;
	console.log("init for webGL2") ;
	this.gl = gl ;
	
	this.ext_vao = true ;
	this.vao_create = function(){ return this.gl.createVertexArray()} ;
	this.vao_bind = function(o){this.gl.bindVertexArray(o)} ;
	this.inst_divisor = function(p,d){this.gl.vertexAttribDivisor(p, d)}
	this.inst_draw = function(m,l,s,o,c){this.gl.drawElementsInstanced(m,l, s, o, c);}
	this.inst_drawa = function(m,s,o,c) {this.gl.drawArrayInstanced(m, s, o, c);}
	this.ext_anis = gl.getExtension("EXT_texture_filter_anisotropic");
	this.ext_mrt = (gl.getParameter(gl.MAX_DRAW_BUFFERS)>1) ;
	if(this.ext_mrt) {
		this.mrt_att = gl.COLOR_ATTACHMENT0 ;
		this.mrt_draw =  function(b,d){return gl.drawBuffers(b,d)} ;
	}

	this.dmodes = {"tri_strip":gl.TRIANGLE_STRIP,"tri":gl.TRIANGLES,"points":gl.POINTS,"lines":gl.LINES,"line_strip":gl.LINE_STRIP }
	this.version = 2 ;
	return true ;
}
WWG.prototype.loadAjax = function(src,opt) {
	return new Promise(function(resolve,reject) {
		var req = new XMLHttpRequest();
		req.open("get",src,true) ;
		req.responseType = (opt && opt.type)?opt.type:"text" ;
		req.onload = function() {
			if(this.status==200) {
				resolve(this.response) ;
			} else {
				reject("Ajax error:"+this.statusText) ;					
			}
		}
		req.onerror = function() {
			reject("Ajax error:"+this.statusText)
		}
		req.send() ;
	})
}
WWG.prototype.loadImageAjax = function(src) {
	var self = this ;
	return new Promise(function(resolve,reject){
		self.loadAjax(src,{type:"blob"}).then(function(b){
			var timg = new Image ;
			timg.onload = function() {
				resolve(timg) ;
			}
			timg.src = URL.createObjectURL(b);
			b = null ;
		}).catch(function(err){
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
	this.obuf = [] ;
	this.modelCount = 0 ;
}
WWG.prototype.Render.prototype.setUnivec = function(uni,value) {
//	console.log("set "+uni.type+"("+uni.pos+") = "+value) ;
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
		case "vec3":
			this.gl.uniform3fv(uni.pos, this.f32Array(value)) ;
			break ;
		case "vec4":
			this.gl.uniform4fv(uni.pos, this.f32Array(value)) ;
			break ;
		case "int":
			this.gl.uniform1i(uni.pos,value) ;
			break ;
		case "float":
			this.gl.uniform1f(uni.pos,value) ;
			break ;
		case "intv":
			this.gl.uniform1iv(uni.pos,this.i16Array(value)) ;
			break ;
		case "floatv":
			this.gl.uniform1fv(uni.pos,this.f32Array(value)) ;
			break ;
		case "sampler2D":
			if(typeof value == 'string') {
				for(var i=0;i<this.data.texture.length;i++) {
					if(this.data.texture[i].name==value) break;
				}
				value = i ;
			}
			this.gl.activeTexture(this.gl.TEXTURE0+uni.texunit);
			this.gl.bindTexture(this.gl.TEXTURE_2D, this.texobj[value]);
			this.gl.uniform1i(uni.pos,uni.texunit) ;
			break ;
	}
}

WWG.prototype.Render.prototype.setShader = function(data) {
	function parse_shader(src) {
		var l = src.split("\n") ;
		var uni = [] ;
		var att = [] ;
		var tu = 0 ;
		for(i=0;i<l.length;i++) {
			var ln = l[i] ;
			if( ln.match(/^\s*uniform\s*([0-9a-z]+)\s*([0-9a-z_]+)(\[[^\]]+\])?/i)) {
				var u = {type:RegExp.$1,name:RegExp.$2} ;
				if(RegExp.$3!="") {
					u.type = u.type+"v" ;
				}
				if(u.type=="sampler2D") u.texunit = tu++ ;
				uni.push(u) ;
			}
			if( ln.match(/^\s*(?:attribute|in)\s*([0-9a-z]+)\s*([0-9a-z_]+)/i)) {
				att.push( {type:RegExp.$1,name:RegExp.$2}) ;
			}
		}
		return {uni:uni,att:att} ;
	}

	var gl = this.gl ;
	var self = this ;
	return new Promise(function(resolve,reject) {
		if(!data.vshader) { reject("no vshader") ;return false;}
		if(!data.fshader) { reject("no fshader") ;return false;}
		var vss ;
		var fss ;
		var pr = [] ;
		if(data.vshader.text ) vss = data.vshader.text ;
		else if(data.vshader.src) {
			pr.push( self.wwg.loadAjax(data.vshader.src).then(function(result) {
				vss = result ;
				resolve() ;
			}).catch(function(err) {
				reject(err) ;
			}))
		}
		if(data.fshader.text ) fss = data.fshader.text ;
		else if(data.fshader.src) {
			pr.push( self.wwg.loadAjax(data.fshader.src).then(function(result) {
				fss = result ;
				resolve() ;
			}).catch(function(err) {
				reject(err) ;
			}))
		}
		Promise.all(pr).then(function(res) {
//			console.log(vss) ;
//			console.log(fss) ;
			var vshader = gl.createShader(gl.VERTEX_SHADER);
			gl.shaderSource(vshader, vss);
			gl.compileShader(vshader);
			if(!gl.getShaderParameter(vshader, gl.COMPILE_STATUS)) {
				reject("vs error:"+gl.getShaderInfoLog(vshader)); return false;
			}
			self.vshader = vshader ;
		
			var fshader = gl.createShader(gl.FRAGMENT_SHADER);
			gl.shaderSource(fshader, fss);
			gl.compileShader(fshader);
			if(!gl.getShaderParameter(fshader, gl.COMPILE_STATUS)) {
				reject("fs error:"+gl.getShaderInfoLog(fshader)); return false;
			}
			self.fshader = fshader ;
			
			var program = gl.createProgram();
			gl.attachShader(program, vshader);
			gl.attachShader(program, fshader);
			gl.linkProgram(program);
			if(!gl.getProgramParameter(program, gl.LINK_STATUS)) {
				reject("link error:"+gl.getProgramInfoLog(program)); return false;
			}
			self.program = program ;
			gl.useProgram(program);
		
			var vr = parse_shader(vss) ;	
//			console.log(vr) ;
			self.vs_att = {} ;	
			for(var i in vr.att) {
				vr.att[i].pos = gl.getAttribLocation(program,vr.att[i].name) ;
				self.vs_att[vr.att[i].name] = vr.att[i] ;
			}
			self.vs_uni = {} ;
			for(var i in vr.uni) {
				vr.uni[i].pos = gl.getUniformLocation(program,vr.uni[i].name) ;
				self.vs_uni[vr.uni[i].name] = vr.uni[i] ;
			}
		
			var fr = parse_shader(fss) ;	
//			console.log(fr);	
			self.fs_uni = {} ;
			for(var i in fr.uni) {
				fr.uni[i].pos = gl.getUniformLocation(program,fr.uni[i].name) ;
				self.fs_uni[fr.uni[i].name] = fr.uni[i] ;
			}
			resolve() ;
		}).catch(function(err){
			reject(err) ;
		}) ;
	})
}
WWG.prototype.Render.prototype.setUniValues = function(data) {
	if(data.vs_uni) {
		for(var i in data.vs_uni) {
			if(this.vs_uni[i]) {
				this.setUnivec(this.vs_uni[i], data.vs_uni[i]) ;
			}  ;
		}
	}
	if(data.fs_uni) {
		for(var i in data.fs_uni) {
			if(this.fs_uni[i]) {
				this.setUnivec(this.fs_uni[i], data.fs_uni[i]) ;
			}  ;
		}
	}
	return true ;
}
WWG.prototype.Render.prototype.genTex = function(img,option) {
	if(!option) option={flevel:0} ;
	var gl = this.gl ;
	var tex = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, tex);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
	gl.generateMipmap(gl.TEXTURE_2D);
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
	var self = this ;
	var gl = this.gl ;

	return new Promise(function(resolve,reject) {
		if(tex.src) {
			if(tex.opt && tex.opt.cors) {
				self.wwg.loadImageAjax(tex.src).then(function(img) {
					resolve( self.genTex(img,tex.opt)) ;
				});
			} else {
				var img = new Image() ;
				img.onload = function() {
					resolve( self.genTex(img,tex.opt) ) ;
				}
				img.onerror = function() {
					reject("cannot load image") ;
				}
				img.src = tex.src ;
			}
		} else if(tex.img instanceof Image) {
			resolve( self.genTex(tex.img,tex.opt) ) 
		} else if(tex.buffer) {
			if(tex.mrt!=undefined) {
				resolve( tex.buffer.fb.t[tex.mrt])
			}
			else resolve( tex.buffer.fb.t) ;
		} else if(tex.texture) {
			resolve( tex.texture) ;
		} else if(tex.canvas) {
			resolve( self.genTex(tex.canvas,tex.opt)) ;
		} else {
			reject("no image")
		}
	})
}
WWG.prototype.Render.prototype.addTex = function(texobj) {
	this.texobj.push(texobj) ;
	return this.texobj.length-1 ;
}
WWG.prototype.Render.prototype.frameBuffer = function(os) {
	var gl = this.gl ;
	console.log("create framebuffer "+os.width+"x"+os.height) ;
	var mrt = os.mrt ;
	var ttype = gl.UNSIGNED_BYTE ;
	var tfilter = gl.LINEAR ;
	if(this.wwg.ext_ftex && os.float ) {
		ttype = gl.FLOAT ;
		tfilter = gl.NEAREST ;
		console.log("use float tex") ;
	}
	var fblist = [] ;
	var frameBuffer = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
	//depth
	var renderBuffer = gl.createRenderbuffer();
	gl.bindRenderbuffer(gl.RENDERBUFFER, renderBuffer);
	gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, os.width, os.height);	
	gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderBuffer);
	//texture
	if(mrt) {
		var fTexture = [] ;
		for(var i=0;i<mrt;i++) {
			fTexture[i] = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, fTexture[i]);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, os.width, os.height, 0, gl.RGBA, ttype, null);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, tfilter);
		    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, tfilter);
			gl.framebufferTexture2D(gl.FRAMEBUFFER, this.wwg.mrt_att + i, gl.TEXTURE_2D, fTexture[i], 0);	
			fblist.push(this.wwg.mrt_att + i)		
		}
	} else {
		var fTexture = gl.createTexture()
		gl.bindTexture(gl.TEXTURE_2D, fTexture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, os.width, os.height, 0, gl.RGBA, ttype, null);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, tfilter);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, tfilter);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fTexture, 0);
	}
	gl.bindTexture(gl.TEXTURE_2D, null);
	gl.bindRenderbuffer(gl.RENDERBUFFER, null);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);	

	var ret = {width:os.width,height:os.height,f:frameBuffer,d:renderBuffer,t:fTexture}
	if(mrt) ret.fblist = fblist ;
	return ret ;
}
WWG.prototype.Render.prototype.setRender =function(data) {
	var gl = this.gl ;
	this.env = data.env ;
	this.data = data ;
	var self = this ;

	return new Promise(function(resolve,reject) {
		if(!gl) { reject("no init") ;return ;}
		var pr = [] ;
		self.setShader(data).then(function() {
			// load textures
			if(data.texture) {
				for(var i=0;i<data.texture.length;i++) {
					pr.push(self.loadTex( data.texture[i])) ;
				}
			}

			Promise.all(pr).then(function(result) {
//				console.log(result) ;
				self.texobj = result ;
				
				// set initial values
				if(!self.setUniValues(data)) {
					reject("no uniform name") ;
					return ;
				}
				if(self.env.cull) gl.enable(gl.CULL_FACE); else gl.disable(gl.CULL_FACE);
				if(self.env.face_cw) gl.frontFace(gl.CW); else gl.frontFace(gl.CCW);
				if(!self.env.nodepth) gl.enable(gl.DEPTH_TEST); else gl.disable(gl.DEPTH_TEST);		
		
				//set model 
				for(var i =0;i<data.model.length;i++) {
					self.obuf[i] = self.setObj( data.model[i],true) ;
				}
				self.modelCount = data.model.length ;
//				console.log(self.obuf);
				
				if(self.env.offscreen) {// renderbuffer 
					if(self.env.offscreen.mrt) { //MRT
						if(!self.wwg.ext_mrt) reject("MRT not support") ;
					}
					self.fb = self.frameBuffer(self.env.offscreen) ;	
				}
				resolve(self) ;
				
			}).catch(function(err) {
				reject(err) ;
			})
		}).catch(function(err) {reject(err);})
	});
}

WWG.prototype.Render.prototype.clear = function() {
	var cc = this.env.clear_color ;
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
WWG.prototype.Render.prototype.setObj = function(obj,flag) {
	var gl = this.gl
	var geo = obj.geo ;
	var inst = obj.inst ;
	ret = {} ;
	
	if(this.wwg.ext_vao) {
		var vao = this.wwg.vao_create() ;
		this.wwg.vao_bind(vao);
		ret.vao = vao ;
	}
	
	var vbo = gl.createBuffer() 
	gl.bindBuffer(gl.ARRAY_BUFFER, vbo) ;

	var tl = 0 ;
	var ats = [] ;
	for(var i=0;i<geo.vtx_at.length;i++) {
		ats.push( this.vs_att[geo.vtx_at[i]] ) ;
		tl += this.wwg.vsize[this.vs_att[geo.vtx_at[i]].type] ;
	}
	tl = tl*4 ;
	ret.ats = ats ;
	ret.tl = tl ;
	var ofs = 0 ;
	for(var i in this.vs_att ) {
		gl.disableVertexAttribArray(this.vs_att[i].pos);
	}
	for(var i=0;i<ats.length;i++) {
		var s = this.wwg.vsize[ats[i].type] ;
		gl.enableVertexAttribArray(this.vs_att[ats[i].name].pos);
		gl.vertexAttribPointer(this.vs_att[ats[i].name].pos, s, gl.FLOAT, false, tl, ofs);
		ofs += s*4 ;	
	} 	
	ret.vbo = vbo ;

	if(geo.idx) {
		var ibo = gl.createBuffer() ;
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo) ;
		ret.ibo = ibo ;
	}
	if(inst) {
		var ibuf = gl.createBuffer() 
		gl.bindBuffer(gl.ARRAY_BUFFER, ibuf) ;
		var tl = 0 ;
		var ats = [] ;
		for(var i=0;i<inst.attr.length;i++) {
			ats.push( this.vs_att[inst.attr[i]] ) ;
			tl += this.wwg.vsize[this.vs_att[inst.attr[i]].type] ;
		}
		tl = tl*4 ;
		ret.iats = ats ;
		ret.itl = tl ;
		var ofs = 0 ;
		for(var i=0;i<ats.length;i++) {
			var divisor = (inst.divisor)?inst.divisor[i]:1 ;
			var s = this.wwg.vsize[ats[i].type] ;
			var pos = this.vs_att[ats[i].name].pos
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
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, 
			this.i16Array(geo.idx),gl.STATIC_DRAW ) ;
	}
	if(flag && inst) {
		gl.bindBuffer(gl.ARRAY_BUFFER, ibuf) ;
		gl.bufferData(gl.ARRAY_BUFFER, 
			this.f32Array(inst.data),(inst.dynamic)?gl.DYNAMIC_DRAW:gl.STATIC_DRAW ) ;
	}
	if(this.wwg.ext_vao) this.wwg.vao_bind(null);
		
	return ret ;
}
WWG.prototype.Render.prototype.getModelIdx = function(name) {
	var idx = -1 ;
	if(typeof name != 'string') idx = parseInt(name) ;
	else {
		for(var i=0;i<this.data.model.length;i++) {
			if(this.data.model[i].name==name) break ;
		}
		idx =i ;
	}	
	return idx ;	
}
// add model
WWG.prototype.Render.prototype.addModel = function(model) {
	this.data.model.push(model) ;
	this.obuf.push(this.setObj(model,true)) ;
	this.modelCount = this.data.model.length ;
}
// update attribute buffer 
WWG.prototype.Render.prototype.updateModel = function(name,mode,buf) {
	var idx = this.getModelIdx(name) ;
	var obuf = this.obuf[idx] ;
	switch(mode) {
		case "vbo":	
			this.gl.bindBuffer(this.gl.ARRAY_BUFFER, obuf.vbo) ;
			break ;
		case "inst":
			this.gl.bindBuffer(this.gl.ARRAY_BUFFER, obuf.inst) ;
			break ;
	}
	this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, buf)	
}
WWG.prototype.Render.prototype.getModelData =function(name) {
	var idx = this.getModelIdx(name) ;
	return this.data.model[idx] ;
}
//update uniform values
WWG.prototype.Render.prototype.pushUniValues = function(u) {
	if(u.vs_uni) {
		for(var i in u.vs_uni) {
			this.update_uni.vs_uni[i] = u.vs_uni[i] ;
		}
	}
	if(u.fs_uni) {
		for(var i in u.fs_uni) {
			this.update_uni.fs_uni[i] = u.fs_uni[i] ;
		}
	}
}
WWG.prototype.Render.prototype.updateUniValues = function(u) {
	if(!u) {
		this.update_uni = {vs_uni:{},fs_uni:{}} ;
		return ;
	}
//	console.log(this.update_uni);
	this.setUniValues(this.update_uni)
}

// draw call
WWG.prototype.Render.prototype.draw = function(update,cls) {
//	console.log("draw");

	var gl = this.gl ;
	gl.useProgram(this.program);

	if(this.env.offscreen) {// renderbuffer 
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb.f);
		if(this.env.offscreen.mrt) this.wwg.mrt_draw(this.fb.fblist);
		gl.viewport(0,0,this.fb.width,this.fb.height) ;
	}
	if(!cls) this.clear() ;
	for(var b=0;b<this.obuf.length;b++) {
		var cmodel = this.data.model[b] ;
		if(cmodel.hide) continue ;
		var geo = cmodel.geo ;

		this.updateUniValues(null) ;
		this.pushUniValues(this.data) ;
		this.pushUniValues(cmodel);
		if(update) {
			// set modified values
			this.pushUniValues(update) ;
			if(update.model) {
				var model =update.model[b] ;
				if(model) this.pushUniValues(model) ;
			}
		}
		this.updateUniValues(1)

		var obuf = this.obuf[b] ;
		var ofs = 0 ;
		if(this.wwg.ext_vao)  this.wwg.vao_bind(obuf.vao);
		else {
			gl.bindBuffer(gl.ARRAY_BUFFER, obuf.vbo) ;
			var aofs = 0 ;
			for(var i in this.vs_att ) {
				gl.disableVertexAttribArray(this.vs_att[i].pos);
			}
			for(var i=0;i<obuf.ats.length;i++) {
				var s = this.wwg.vsize[obuf.ats[i].type] ;
				gl.enableVertexAttribArray(this.vs_att[obuf.ats[i].name].pos);
				gl.vertexAttribPointer(this.vs_att[obuf.ats[i].name].pos, s, gl.FLOAT, false, obuf.tl, aofs);
				aofs += s*4 ;	
			}
			if(this.obuf[b].ibo) gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.obuf[b].ibo) ;
			if(this.obuf[b].inst) {
				gl.bindBuffer(gl.ARRAY_BUFFER, this.obuf[b].inst) ;
				var aofs = 0 ;
				for(var i=0;i<obuf.iats.length;i++) {
//					var divisor = (inst.divisor)?inst.divisor[i]:1 ;
					var s = this.wwg.vsize[obuf.iats[i].type] ;
					var pos = this.vs_att[obuf.iats[i].name].pos
					gl.enableVertexAttribArray(pos);
					gl.vertexAttribPointer(pos, s, gl.FLOAT, false, obuf.itl, aofs);
					aofs += s*4 ;
					this.wwg.inst_divisor(pos, 1)	
				}
			}
		}
		if(cmodel.preFunction) {
			cmodel.preFunction(gl,cmodel,this.obuf[b]) ;
		}
		var gmode = this.wwg.dmodes[geo.mode]
		if(gmode==undefined) {
				console.log("Error: illigal draw mode") ;
				return false ;
		}
		if(cmodel.inst) {
			if(geo.idx) this.wwg.inst_draw(gmode, geo.idx.length, gl.UNSIGNED_SHORT, ofs, cmodel.inst.count);
			else this.wwg.inst_drawa(gmode, gl.UNSIGNED_SHORT, ofs, cmodel.inst.count);
		} else {
			if(geo.idx) gl.drawElements(gmode, geo.idx.length, gl.UNSIGNED_SHORT, ofs);
			else gl.drawArrays(gmode, ofs,geo.vtx.length/3);
		}
		if(this.wwg.ext_vao) this.wwg.vao_bind(null);
		else {
			
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
}//Model library for WWG
// Version 0.9 
// 2016-2017 wakufactory.jp 
// license: MIT 

var WWModel = function(){
	
}
WWModel.prototype.loadAjax = function(src) {
	return new Promise(function(resolve,reject) {
		var req = new XMLHttpRequest();
		req.open("get",src,true) ;
		req.responseType = "text" ;
		req.onload = function() {
			if(this.status==200) {
				resolve(this.response) ;
			} else {
				reject("Ajax error:"+this.statusText) ;					
			}
		}
		req.onerror = function() {
			reject("Ajax error:"+this.statusText)
		}
		req.send() ;
	})
}
// load .obj file
WWModel.prototype.loadObj = function(path,scale) {
	var self = this ;
	if(!scale) scale=1.0 ;
	return new Promise(function(resolve,reject) {
		self.loadAjax(path).then(function(data) {
//			console.log(data) ;
			var l = data.split("\n") ;
			var v = [];
			var n = [] ;
			var x = [] ;
			var t = [] ;
			var xi = {} ;
			var xic = 0 ;

			for(var i = 0;i<l.length;i++) {
				if(l[i].match(/^#/)) continue ;
				if(l[i].match(/^eof/)) break ;
				var ll = l[i].split(/\s+/) ;
				if(ll[0] == "v") {
					v.push([ll[1]*scale,ll[2]*scale,ll[3]*scale]) ;
				}
				if(ll[0] == "vt") {
					t.push([ll[1],ll[2]]) ;
				}
				if(ll[0] == "vn") {
					n.push([ll[1],ll[2],ll[3]]) ;
				}
				if(ll[0] == "f") {
					var ix = [] ;
					for(var ii=1;ii<ll.length;ii++) {
						if(ll[ii]=="") continue ;
						if(!(ll[ii] in xi)) xi[ll[ii]] = xic++ ; 
						ix.push(xi[ll[ii]]) ;
					}
					x.push(ix) ;
				}
			}
			self.obj_v = [] ;
			self.obj_i =x ;
			if(n.length>0) self.obj_n = [] ;
			if(t.length>0) self.obj_t = [] ;
			for(var i in xi) {
				var si = i.split("/") ;
				var ind = xi[i] ;
				self.obj_v[ind] = v[si[0]-1] ;
				if(t.length>0) self.obj_t[ind] = t[si[1]-1] ;
				if(n.length>0) self.obj_n[ind] = n[si[2]-1] ;
			}
			console.log("loadobj "+path+" vtx:"+v.length+" norm:"+n.length+" tex:"+t.length+" idx:"+x.length+" vbuf:"+self.obj_v.length) ;
			resolve(self) ;
		}).catch(function(err) {
			reject(err) ;
		})
	}) ;
}
//convert vtx data to vbo array
WWModel.prototype.objModel  = function(addvec,mode) {
	var v = this.obj_v ;
	var s = this.obj_i ;
	var n = this.obj_n ;
	var t = this.obj_t ;

	var vbuf = [] ;
	var ibuf = [] ;
	var sf = [] ;
	var sn = [] ;
	var ii = 0 ;
	if(!n) this.obj_n = [] ;

	for(var i=0;i<s.length;i++) {
		var p = s[i] ;
		if(!n) {
			//面法線算出
			var pa = [] ;
			for(var j=0;j<3;j++) {
				pa[j] = v[p[j]] ;
			}
			var yx = pa[1][0]-pa[0][0];
			var yy = pa[1][1]-pa[0][1];
			var yz = pa[1][2]-pa[0][2];
			var zx = pa[2][0]-pa[0][0];
			var zy = pa[2][1]-pa[0][1];
			var zz = pa[2][2]-pa[0][2];				
			var xx =  yy * zz - yz * zy;
			var xy = -yx * zz + yz * zx;
			var xz =  yx * zy - yy * zx;
			var vn = Math.sqrt(xx*xx+xy*xy+xz*xz) ;
			xx /= vn ; xy /= vn ; xz /= vn ;
			sf.push( [xx,xy,xz]) ;
			//面リスト
			for(var j=0;j<p.length;j++) {
				if(!sn[p[j]]) sn[p[j]] = [] ;
				sn[p[j]].push(i) ;
			}
		}
		//3角分割
		for(var j=1;j<p.length-1;j++) {
			ibuf.push(p[0]) ;
			ibuf.push(p[j]) ;
			ibuf.push(p[j+1] ) ;
		}
		ii += p.length ;
	}
	console.log(" poly:"+ibuf.length/3);
	for(var i=0;i<v.length;i++) {
		vbuf.push( v[i][0] ) ;
		vbuf.push( v[i][1] ) ;
		vbuf.push( v[i][2] ) ;
		var nx=0,ny=0,nz=0 ;		
		if(n) {
			nx = n[i][0] ;
			ny = n[i][1] ;
			nz = n[i][2] ;
		} else {
			//面法線の合成
			for(var j=0;j<sn[i].length;j++) {
				var ii = sn[i][j] ;
				nx += sf[ii][0] ;
				ny += sf[ii][1] ;
				nz += sf[ii][2] ;
			}
		}
		var vn = Math.sqrt(nx*nx+ny*ny+nz*nz) ;
		vbuf.push(nx/vn) ;
		vbuf.push(ny/vn) ;
		vbuf.push(nz/vn) ;
		if(!n) {
			this.obj_n.push([nx/vn,ny/vn,nz/vn]); 
		}
		if(t) {
			vbuf.push(t[i][0]) ;
			vbuf.push(t[i][1]) ;
		}
		if(addvec) {
			for(av=0;av<addvec.length;av++) {
				vbuf = vbuf.concat(addvec[av].data[i]) ;
			}
		}
	}
//	console.log(vbuf) ;
//	console.log(ibuf) ;
	this.ibuf = ibuf ;
	this.vbuf = vbuf ;
	var ret = {mode:"tri",vtx_at:["position","norm"],vtx:vbuf,idx:ibuf} ;
	if(t) ret.vtx_at.push("uv") ;
	if(addvec) {
		for(av=0;av<addvec.length;av++) ret.vtx_at.push(addvec[av].attr) ;
	}
	return ret ;
}
// generate normal vector lines
WWModel.prototype.normLines = function() {
	var nv = [] ;
	var v = this.obj_v
	var n = this.obj_n ;
	var vm = 0.1
	for(var i=0;i<v.length;i++) {
		nv.push(v[i][0]) ;
		nv.push(v[i][1]) ;
		nv.push(v[i][2]) ;
		nv.push(v[i][0]+n[i][0]*vm) ;
		nv.push(v[i][1]+n[i][1]*vm) ;
		nv.push(v[i][2]+n[i][2]*vm) ;
	}
	return  {mode:"lines",vtx_at:["position"],vtx:nv} ;
}
// mult 4x4 matrix
WWModel.prototype.multMatrix4 = function(m4) {
	var inv = new CanvasMatrix4(m4).invert().transpose() ;
	for(var i=0;i<this.obj_v.length;i++) {
		var v = this.obj_v[i] ;
		var vx = m4.m11 * v[0] + m4.m21 * v[1] + m4.m31 * v[2] + m4.m41 ;
		var vy = m4.m12 * v[0] + m4.m22 * v[1] + m4.m32 * v[2] + m4.m42 ;
		var vz = m4.m13 * v[0] + m4.m23 * v[1] + m4.m33 * v[2] + m4.m43 ;
		this.obj_v[i] = [vx,vy,vz] ;
	}
}
WWModel.prototype.mergeModels = function(models) {
	var m = this ;
	var ofs = 0 ;
	for(var i=0;i<models.length;i++) {
		m.obj_v = m.obj_v.concat(models[i].obj_v) 
		m.obj_n = m.obj_n.concat(models[i].obj_n) 
		m.obj_t = m.obj_t.concat(models[i].obj_t)
		for(var j=0;j<models[i].obj_i.length;j++) {
			var p = models[i].obj_i[j] ;
			var pp = [] ;
			for( n=0;n<p.length;n++) {
				pp.push( p[n]+ofs ) ;
			}
			m.obj_i.push(pp) ;
		}
		ofs += models[i].obj_v.length ;
	}
	return m ;
}
// generate primitive
WWModel.prototype.primitive  = function(type,param) {
	if(!param) param = {} ;
	var wx = (param.wx)?param.wx:1.0 ;
	var wy = (param.wy)?param.wy:1.0 ;
	var wz = (param.wz)?param.wz:1.0 ;
	var div = (param.div)?param.div:10 ;
	var ninv = (param.ninv)?-1:1 ;
	var p = [] ;
	var n = [] ;
	var t = [] ;
	var s = [] ;
	var PHI = Math.PI *2 ;
	switch(type) {
	case "sphere":
		for(var i = 0 ; i <= div ; ++i) {
			var v = i / (0.0+div);
			var y = Math.cos(Math.PI * v), r = Math.sin(Math.PI * v);
			for(var j = 0 ; j <= div*2 ; ++j) {
				var u = j / (0.0+div*2) ;
				var x = (Math.cos(PHI * u) * r)
				var z = (Math.sin(PHI * u) * r)
				p.push([x*wx,y*wy,z*wz])
				n.push([x*ninv,y*ninv,z*ninv])
				t.push([1-u,1-v])
			}
		}
		var d2 = div*2+1 ;
		for(var j = 0 ; j < div ; ++j) {
			var base = j * d2;
			for(var i = 0 ; i < div*2 ; ++i) {
				if(ninv>0) s.push(
					[base + i,	  base + i + 1, base + i     + d2],
					[base + i + d2, base + i + 1, base + i + 1 + d2]);
				else s.push(
					[base + i     + d2,	base + i + 1, base + i],
					[base + i + 1 + d2, base + i + 1, base + i + d2 ]);

			}
		}
		break;
	case "cylinder":
		for(var i = 0 ; i <= div ; ++i) {
			var v = i / (0.0+div);
			var z = Math.cos(PHI * v)*wz, x = Math.sin(PHI * v)*wx;
			p.push([x,wy,z])
			n.push([x*ninv,0,z*ninv])
			t.push([v,1])
			p.push([x,-wy,z])
			n.push([x*ninv,0,z*ninv,0])
			t.push([v,0])			
		}
		for(var j =0; j < div ;j++) {
			if(ninv<0)s.push([j*2,j*2+2,j*2+3,j*2+1]) ;
			else s.push([j*2,j*2+1,j*2+3,j*2+2]) ;
		}
		break; 
	case "cone":
		for(var i = 0 ; i <= div ; ++i) {
			var v = i / (0.0+div);
			var z = Math.cos(PHI * v)*wz, x = Math.sin(PHI * v)*wx;
			p.push([0,wy,0])
			n.push([x*ninv,0,z*ninv])
			t.push([v,1])
			p.push([x,-wy,z])
			n.push([x*ninv,0,z*ninv,0])
			t.push([v,0])			
		}
		for(var j =0; j < div ;j++) {
			if(ninv<0)s.push([j*2,j*2+2,j*2+3,j*2+1]) ;
			else s.push([j*2,j*2+1,j*2+3,j*2+2]) ;
		}
		break; 
	case "disc":
		for(var i = 0 ; i < div ; ++i) {
			var v = i / (0.0+div);
			var z = Math.cos(PHI * v)*wz, x = Math.sin(PHI * v)*wx;
			p.push([x,0,z])
			n.push([0,1,0])
			t.push([v,1])	
		}
		p.push([0,0,0])
		n.push([0,1,0])
		t.push([0,0])
		for(var j =0; j < div-1 ;j++) {
			s.push([j,j+1,div]) ;
		}
		s.push([j,0,div])
		break; 
	case "plane":
		p = [[wx,0,wz],[wx,0,-wz],[-wx,0,-wz],[-wx,0,wz]]
		n = [[0,1,0],[0,1,0],[0,1,0],[0,1,0]]
		t = [[1,0],[1,1],[0,1],[0,0]]
		s = [[0,1,2],[2,3,0]]
		break ;
	case "box":
		p = [
			[wx,wy,wz],[wx,-wy,wz],[-wx,-wy,wz],[-wx,wy,wz],
			[wx,wy,-wz],[wx,-wy,-wz],[-wx,-wy,-wz],[-wx,wy,-wz],
			[wx,wy,wz],[wx,-wy,wz],[wx,-wy,-wz],[wx,wy,-wz],
			[-wx,wy,wz],[-wx,-wy,wz],[-wx,-wy,-wz],[-wx,wy,-wz],
			[wx,wy,wz],[wx,wy,-wz],[-wx,wy,-wz],[-wx,wy,wz],
			[wx,-wy,wz],[wx,-wy,-wz],[-wx,-wy,-wz],[-wx,-wy,wz],
		]
		n = [
			[0,0,ninv],[0,0,ninv],[0,0,ninv],[0,0,ninv],
			[0,0,-ninv],[0,0,-ninv],[0,0,-ninv],[0,0,-ninv],
			[ninv,0,0],[ninv,0,0],[ninv,0,0],[ninv,0,0],
			[-ninv,0,0],[-ninv,0,0],[-ninv,0,0],[-ninv,0,0],
			[0,ninv,0],[0,ninv,0],[0,ninv,0],[0,ninv,0],
			[0,-ninv,0],[0,-ninv,0],[0,-ninv,0],[0,-ninv,0]
		]
		t = [
			[1,1],[1,0],[0,0],[0,1],
			[0,1],[0,0],[1,0],[1,1],
			[0,1],[0,0],[1,0],[1,1],
			[1,1],[1,0],[0,0],[0,1],
			[1,0],[1,1],[0,1],[0,0],
			[1,1],[1,0],[0,0],[0,1]
		]
		s = (ninv>0)?[
			[3,1,0],[2,1,3],
			[4,5,7],[7,5,6],
			[8,9,11],[11,9,10],
			[15,13,12],[14,13,15],	
			[16,17,19],[19,17,18],
			[23,21,20],[22,21,23],		
		]:[
			[0,1,3],[3,1,2],
			[7,5,4],[6,5,7],
			[11,9,8],[10,9,11],
			[12,13,15],[15,13,14],	
			[19,17,16],[18,17,19],
			[20,21,23],[23,21,22],		
		]
		break ;
	case "mesh":
		
		break ;
	case "torus":
		this.parametricModel( function(u,v) {
			var R = 1.0 ;
			var sr = (param.sr)?param.sr:0.5 ;
			var du = u ;
			var dv = -v ;
			var cx = Math.sin(du*PHI) ;
			var cz = Math.cos(du*PHI) ;
			var vx = Math.sin(dv*PHI) ;
			var vy = Math.cos(dv*PHI) ;
			var tx = 1
			var mx = sr*vx*cx ;
			var mz = sr*vx*cz ;
			var my = sr*vy ;
			var ml = Math.sqrt(mx*mx+my*my+mz*mz) ;
	
			var px = R*cx + tx*mx ;
			var pz = R*cz + tx*mz ;
			var py = tx*my ;
			var r = {
				px:px*wx, py:py*wy, pz:pz*wz,
				nx:0, ny:0, nz:0,
				mu:u, mv:v }
			return r ;			
			
		},{start:0,end:1.0,div:div*2},{start:0,end:1,div:div},{ninv:param.ninv}) ;
		return this ;
	}	
	this.obj_v = p 
	this.obj_n = n
	this.obj_t = t
	this.obj_i = s
//	console.log(p)
//	console.log(n)
//	console.log(t)
//	console.log(s)
	return this ;
}
// generate parametric model by function
WWModel.prototype.parametricModel =function(func,pu,pv,opt) {
	var pos = [] ;
	var norm = [] ;
	var uv = [] ;
	var indices = [] ;
	var ninv = (opt && opt.ninv)?-1:1 ;

	var du = (pu.end - pu.start)/pu.div ;
	var dv = (pv.end - pv.start)/pv.div ;
	for(var iu =0; iu <= pu.div ;iu++ ) {
		for(var iv = 0 ;iv<= pv.div; iv++ ) {
			var u = pu.start+du*iu ;
			var v = pv.start+dv*iv ;
			var p = func(u,v) ;
			pos.push( [p.px,p.py,p.pz] ) ;
			if(p.mu!=undefined) uv.push([p.mu,p.mv]) ;
			// calc normal
			if(p.nx==0&&p.ny==0&&p.nz==0) {
				var dud = du/10 ; var dvd = dv/10 ;
				var du0 = func(u-dud,v) ; var du1 = func(u+dud,v) ;
				var nux = (du1.px - du0.px)/(dud*2) ;
				var nuy = (du1.py - du0.py)/(dud*2) ;
				var nuz = (du1.pz - du0.pz)/(dud*2) ;
				var dv0 = func(u,v-dvd) ; var dv1 = func(u,v+dvd) ;
				var nvx = (dv1.px - dv0.px)/(dvd*2) ;
				var nvy = (dv1.py - dv0.py)/(dvd*2) ;
				var nvz = (dv1.pz - dv0.pz)/(dvd*2) ;
				var nx = nuy*nvz - nuz*nvy ;
				var ny = nuz*nvx - nux*nvz ;
				var nz = nux*nvy - nuy*nvx ;
				var nl = Math.sqrt(nx*nx+ny*ny+nz*nz); 
				p.nx = nx/nl ;
				p.ny = ny/nl ;
				p.nz = nz/nl ;
			}
			norm.push([p.nx*ninv, p.ny*ninv,p.nz*ninv] ) ;
		}
	}
	var d2 = pv.div+1 ;
	for(var j = 0 ; j < pu.div ; ++j) {
		var base = j * d2;
		for(var i = 0 ; i < pv.div ; ++i) {
			if(ninv>0) indices.push([base+i,base+i+d2,base+i+d2+1,base+i+1])	
			else  indices.push([base+i+1,base+i+d2+1,base+i+d2,base+i])	
		}	

	}
	this.obj_v = pos
	this.obj_n = norm
	if(uv.length>0) this.obj_t = uv
	this.obj_i = indices 
	return this ;
}

// other utils 
WWModel.HSV2RGB = function( H, S, V ) {
	var ih;
	var fl;
	var m, n;
	var rr,gg,bb ;
	H = H * 6 ;
	ih = Math.floor( H );
	fl = H - ih;
	if( !(ih & 1)) fl = 1 - fl;
	m = V * ( 1 - S );
	n = V * ( 1 - S * fl );
	switch( ih ){
		case 0:
		case 6:
			rr = V; gg = n; bb = m; break;
		case 1: rr = n; gg = V; bb = m; break;
		case 2: rr = m; gg = V; bb = n; break;
		case 3: rr = m; gg = n; bb = V; break;
		case 4: rr = n; gg = m; bb = V; break;
		case 5: rr = V; gg = m; bb = n; break;
	}
	return [rr,gg,bb,1.0] ;
}
WWModel.snormal = function(pa) {
	var yx = pa[1][0]-pa[0][0];
	var yy = pa[1][1]-pa[0][1];
	var yz = pa[1][2]-pa[0][2];
	var zx = pa[2][0]-pa[0][0];
	var zy = pa[2][1]-pa[0][1];
	var zz = pa[2][2]-pa[0][2];				
	var xx =  yy * zz - yz * zy;
	var xy = -yx * zz + yz * zx;
	var xz =  yx * zy - yy * zx;
	var vn = Math.sqrt(xx*xx+xy*xy+xz*xz) ;
	xx /= vn ; xy /= vn ; xz /= vn ;
	return [xx,xy,xz] ;
}/*
 * Copyright (C) 2009 Apple Inc. All Rights Reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL APPLE INC. OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. 
 */
/* modified by wakufactory */
/*
    CanvasMatrix4 class
    
    This class implements a 4x4 matrix. It has functions which
    duplicate the functionality of the OpenGL matrix stack and
    glut functions.
    
    IDL:
    
    [
        Constructor(in CanvasMatrix4 matrix),           // copy passed matrix into new CanvasMatrix4
        Constructor(in sequence<float> array)           // create new CanvasMatrix4 with 16 floats (row major)
        Constructor()                                   // create new CanvasMatrix4 with identity matrix
    ]
    interface CanvasMatrix4 {
        attribute float m11;
        attribute float m12;
        attribute float m13;
        attribute float m14;
        attribute float m21;
        attribute float m22;
        attribute float m23;
        attribute float m24;
        attribute float m31;
        attribute float m32;
        attribute float m33;
        attribute float m34;
        attribute float m41;
        attribute float m42;
        attribute float m43;
        attribute float m44;

        void load(in CanvasMatrix4 matrix);                 // copy the values from the passed matrix
        void load(in sequence<float> array);                // copy 16 floats into the matrix
        sequence<float> getAsArray();                       // return the matrix as an array of 16 floats
        WebGLFloatArray getAsWebGLFloatArray();           // return the matrix as a WebGLFloatArray with 16 values
        void makeIdentity();                                // replace the matrix with identity
        void transpose();                                   // replace the matrix with its transpose
        void invert();                                      // replace the matrix with its inverse
        
        void translate(in float x, in float y, in float z); // multiply the matrix by passed translation values on the right
        void scale(in float x, in float y, in float z);     // multiply the matrix by passed scale values on the right
        void rotate(in float angle,                         // multiply the matrix by passed rotation values on the right
                    in float x, in float y, in float z);    // (angle is in degrees)
        void multRight(in CanvasMatrix matrix);             // multiply the matrix by the passed matrix on the right
        void multLeft(in CanvasMatrix matrix);              // multiply the matrix by the passed matrix on the left
        void ortho(in float left, in float right,           // multiply the matrix by the passed ortho values on the right
                   in float bottom, in float top, 
                   in float near, in float far);
        void frustum(in float left, in float right,         // multiply the matrix by the passed frustum values on the right
                     in float bottom, in float top, 
                     in float near, in float far);
        void perspective(in float fovy, in float aspect,    // multiply the matrix by the passed perspective values on the right
                         in float zNear, in float zFar);
        void lookat(in float eyex, in float eyey, in float eyez,    // multiply the matrix by the passed lookat 
                    in float ctrx, in float ctry, in float ctrz,    // values on the right
                    in float upx, in float upy, in float upz);
    }
*/

CanvasMatrix4 = function(m)
{
    if (typeof m == 'object') {
        if ("length" in m && m.length >= 16) {
            this.load(m);
            return this;
        }
        else if (m instanceof CanvasMatrix4) {
            this.load(m);
            return this;
        }
    }
    this.makeIdentity();
    return this ;
}

CanvasMatrix4.prototype.load = function()
{
    if (arguments.length == 1 && typeof arguments[0] == 'object') {
        var matrix = arguments[0];
        
        if ("length" in matrix && matrix.length == 16) {
            this.m11 = matrix[0];
            this.m12 = matrix[1];
            this.m13 = matrix[2];
            this.m14 = matrix[3];

            this.m21 = matrix[4];
            this.m22 = matrix[5];
            this.m23 = matrix[6];
            this.m24 = matrix[7];

            this.m31 = matrix[8];
            this.m32 = matrix[9];
            this.m33 = matrix[10];
            this.m34 = matrix[11];

            this.m41 = matrix[12];
            this.m42 = matrix[13];
            this.m43 = matrix[14];
            this.m44 = matrix[15];
            return this ;
        }
            
        if (arguments[0] instanceof CanvasMatrix4) {
        
            this.m11 = matrix.m11;
            this.m12 = matrix.m12;
            this.m13 = matrix.m13;
            this.m14 = matrix.m14;

            this.m21 = matrix.m21;
            this.m22 = matrix.m22;
            this.m23 = matrix.m23;
            this.m24 = matrix.m24;

            this.m31 = matrix.m31;
            this.m32 = matrix.m32;
            this.m33 = matrix.m33;
            this.m34 = matrix.m34;

            this.m41 = matrix.m41;
            this.m42 = matrix.m42;
            this.m43 = matrix.m43;
            this.m44 = matrix.m44;
            return this ;
        }
    }
    
    this.makeIdentity();
    return this ;
}

CanvasMatrix4.prototype.getAsArray = function()
{
    return [
        this.m11, this.m12, this.m13, this.m14, 
        this.m21, this.m22, this.m23, this.m24, 
        this.m31, this.m32, this.m33, this.m34, 
        this.m41, this.m42, this.m43, this.m44
    ];
}

CanvasMatrix4.prototype.getAsWebGLFloatArray = function()
{
    return new Float32Array(this.getAsArray());
}

CanvasMatrix4.prototype.makeIdentity = function()
{
    this.m11 = 1;
    this.m12 = 0;
    this.m13 = 0;
    this.m14 = 0;
    
    this.m21 = 0;
    this.m22 = 1;
    this.m23 = 0;
    this.m24 = 0;
    
    this.m31 = 0;
    this.m32 = 0;
    this.m33 = 1;
    this.m34 = 0;
    
    this.m41 = 0;
    this.m42 = 0;
    this.m43 = 0;
    this.m44 = 1;
    return this ;
}

CanvasMatrix4.prototype.transpose = function()
{
    var tmp = this.m12;
    this.m12 = this.m21;
    this.m21 = tmp;
    
    tmp = this.m13;
    this.m13 = this.m31;
    this.m31 = tmp;
    
    tmp = this.m14;
    this.m14 = this.m41;
    this.m41 = tmp;
    
    tmp = this.m23;
    this.m23 = this.m32;
    this.m32 = tmp;
    
    tmp = this.m24;
    this.m24 = this.m42;
    this.m42 = tmp;
    
    tmp = this.m34;
    this.m34 = this.m43;
    this.m43 = tmp;
    return this ;
}

CanvasMatrix4.prototype.invert = function()
{
    // Calculate the 4x4 determinant
    // If the determinant is zero, 
    // then the inverse matrix is not unique.
    var det = this._determinant4x4();

    if (Math.abs(det) < 1e-8)
        return null;

    this._makeAdjoint();

    // Scale the adjoint matrix to get the inverse
    this.m11 /= det;
    this.m12 /= det;
    this.m13 /= det;
    this.m14 /= det;
    
    this.m21 /= det;
    this.m22 /= det;
    this.m23 /= det;
    this.m24 /= det;
    
    this.m31 /= det;
    this.m32 /= det;
    this.m33 /= det;
    this.m34 /= det;
    
    this.m41 /= det;
    this.m42 /= det;
    this.m43 /= det;
    this.m44 /= det;
    return this ;
}

CanvasMatrix4.prototype.translate = function(x,y,z)
{
    if (x == undefined)
        x = 0;
        if (y == undefined)
            y = 0;
    if (z == undefined)
        z = 0;
    
    var matrix = new CanvasMatrix4();
    matrix.m41 = x;
    matrix.m42 = y;
    matrix.m43 = z;

    this.multRight(matrix);
    return this ;
}

CanvasMatrix4.prototype.scale = function(x,y,z)
{
    if (x == undefined)
        x = 1;
    if (z == undefined) {
        if (y == undefined) {
            y = x;
            z = x;
        }
        else
            z = 1;
    }
    else if (y == undefined)
        y = x;
    
    var matrix = new CanvasMatrix4();
    matrix.m11 = x;
    matrix.m22 = y;
    matrix.m33 = z;
    
    this.multRight(matrix);
    return this ;
}

CanvasMatrix4.prototype.rotate = function(angle,x,y,z)
{
    // angles are in degrees. Switch to radians
    angle = angle / 180 * Math.PI;
    
    angle /= 2;
    var sinA = Math.sin(angle);
    var cosA = Math.cos(angle);
    var sinA2 = sinA * sinA;
    
    // normalize
    var length = Math.sqrt(x * x + y * y + z * z);
    if (length == 0) {
        // bad vector, just use something reasonable
        x = 0;
        y = 0;
        z = 1;
    } else if (length != 1) {
        x /= length;
        y /= length;
        z /= length;
    }
    
    var mat = new CanvasMatrix4();

    // optimize case where axis is along major axis
    if (x == 1 && y == 0 && z == 0) {
        mat.m11 = 1;
        mat.m12 = 0;
        mat.m13 = 0;
        mat.m21 = 0;
        mat.m22 = 1 - 2 * sinA2;
        mat.m23 = 2 * sinA * cosA;
        mat.m31 = 0;
        mat.m32 = -2 * sinA * cosA;
        mat.m33 = 1 - 2 * sinA2;
        mat.m14 = mat.m24 = mat.m34 = 0;
        mat.m41 = mat.m42 = mat.m43 = 0;
        mat.m44 = 1;
    } else if (x == 0 && y == 1 && z == 0) {
        mat.m11 = 1 - 2 * sinA2;
        mat.m12 = 0;
        mat.m13 = -2 * sinA * cosA;
        mat.m21 = 0;
        mat.m22 = 1;
        mat.m23 = 0;
        mat.m31 = 2 * sinA * cosA;
        mat.m32 = 0;
        mat.m33 = 1 - 2 * sinA2;
        mat.m14 = mat.m24 = mat.m34 = 0;
        mat.m41 = mat.m42 = mat.m43 = 0;
        mat.m44 = 1;
    } else if (x == 0 && y == 0 && z == 1) {
        mat.m11 = 1 - 2 * sinA2;
        mat.m12 = 2 * sinA * cosA;
        mat.m13 = 0;
        mat.m21 = -2 * sinA * cosA;
        mat.m22 = 1 - 2 * sinA2;
        mat.m23 = 0;
        mat.m31 = 0;
        mat.m32 = 0;
        mat.m33 = 1;
        mat.m14 = mat.m24 = mat.m34 = 0;
        mat.m41 = mat.m42 = mat.m43 = 0;
        mat.m44 = 1;
    } else {
        var x2 = x*x;
        var y2 = y*y;
        var z2 = z*z;
    
        mat.m11 = 1 - 2 * (y2 + z2) * sinA2;
        mat.m12 = 2 * (x * y * sinA2 + z * sinA * cosA);
        mat.m13 = 2 * (x * z * sinA2 - y * sinA * cosA);
        mat.m21 = 2 * (y * x * sinA2 - z * sinA * cosA);
        mat.m22 = 1 - 2 * (z2 + x2) * sinA2;
        mat.m23 = 2 * (y * z * sinA2 + x * sinA * cosA);
        mat.m31 = 2 * (z * x * sinA2 + y * sinA * cosA);
        mat.m32 = 2 * (z * y * sinA2 - x * sinA * cosA);
        mat.m33 = 1 - 2 * (x2 + y2) * sinA2;
        mat.m14 = mat.m24 = mat.m34 = 0;
        mat.m41 = mat.m42 = mat.m43 = 0;
        mat.m44 = 1;
    }
    this.multRight(mat);
    return this ;
}

CanvasMatrix4.prototype.multRight = function(mat)
{
    var m11 = (this.m11 * mat.m11 + this.m12 * mat.m21
               + this.m13 * mat.m31 + this.m14 * mat.m41);
    var m12 = (this.m11 * mat.m12 + this.m12 * mat.m22
               + this.m13 * mat.m32 + this.m14 * mat.m42);
    var m13 = (this.m11 * mat.m13 + this.m12 * mat.m23
               + this.m13 * mat.m33 + this.m14 * mat.m43);
    var m14 = (this.m11 * mat.m14 + this.m12 * mat.m24
               + this.m13 * mat.m34 + this.m14 * mat.m44);

    var m21 = (this.m21 * mat.m11 + this.m22 * mat.m21
               + this.m23 * mat.m31 + this.m24 * mat.m41);
    var m22 = (this.m21 * mat.m12 + this.m22 * mat.m22
               + this.m23 * mat.m32 + this.m24 * mat.m42);
    var m23 = (this.m21 * mat.m13 + this.m22 * mat.m23
               + this.m23 * mat.m33 + this.m24 * mat.m43);
    var m24 = (this.m21 * mat.m14 + this.m22 * mat.m24
               + this.m23 * mat.m34 + this.m24 * mat.m44);

    var m31 = (this.m31 * mat.m11 + this.m32 * mat.m21
               + this.m33 * mat.m31 + this.m34 * mat.m41);
    var m32 = (this.m31 * mat.m12 + this.m32 * mat.m22
               + this.m33 * mat.m32 + this.m34 * mat.m42);
    var m33 = (this.m31 * mat.m13 + this.m32 * mat.m23
               + this.m33 * mat.m33 + this.m34 * mat.m43);
    var m34 = (this.m31 * mat.m14 + this.m32 * mat.m24
               + this.m33 * mat.m34 + this.m34 * mat.m44);

    var m41 = (this.m41 * mat.m11 + this.m42 * mat.m21
               + this.m43 * mat.m31 + this.m44 * mat.m41);
    var m42 = (this.m41 * mat.m12 + this.m42 * mat.m22
               + this.m43 * mat.m32 + this.m44 * mat.m42);
    var m43 = (this.m41 * mat.m13 + this.m42 * mat.m23
               + this.m43 * mat.m33 + this.m44 * mat.m43);
    var m44 = (this.m41 * mat.m14 + this.m42 * mat.m24
               + this.m43 * mat.m34 + this.m44 * mat.m44);
    
    this.m11 = m11;
    this.m12 = m12;
    this.m13 = m13;
    this.m14 = m14;
    
    this.m21 = m21;
    this.m22 = m22;
    this.m23 = m23;
    this.m24 = m24;
    
    this.m31 = m31;
    this.m32 = m32;
    this.m33 = m33;
    this.m34 = m34;
    
    this.m41 = m41;
    this.m42 = m42;
    this.m43 = m43;
    this.m44 = m44;
    return this ;
}

CanvasMatrix4.prototype.multLeft = function(mat)
{
    var m11 = (mat.m11 * this.m11 + mat.m12 * this.m21
               + mat.m13 * this.m31 + mat.m14 * this.m41);
    var m12 = (mat.m11 * this.m12 + mat.m12 * this.m22
               + mat.m13 * this.m32 + mat.m14 * this.m42);
    var m13 = (mat.m11 * this.m13 + mat.m12 * this.m23
               + mat.m13 * this.m33 + mat.m14 * this.m43);
    var m14 = (mat.m11 * this.m14 + mat.m12 * this.m24
               + mat.m13 * this.m34 + mat.m14 * this.m44);

    var m21 = (mat.m21 * this.m11 + mat.m22 * this.m21
               + mat.m23 * this.m31 + mat.m24 * this.m41);
    var m22 = (mat.m21 * this.m12 + mat.m22 * this.m22
               + mat.m23 * this.m32 + mat.m24 * this.m42);
    var m23 = (mat.m21 * this.m13 + mat.m22 * this.m23
               + mat.m23 * this.m33 + mat.m24 * this.m43);
    var m24 = (mat.m21 * this.m14 + mat.m22 * this.m24
               + mat.m23 * this.m34 + mat.m24 * this.m44);

    var m31 = (mat.m31 * this.m11 + mat.m32 * this.m21
               + mat.m33 * this.m31 + mat.m34 * this.m41);
    var m32 = (mat.m31 * this.m12 + mat.m32 * this.m22
               + mat.m33 * this.m32 + mat.m34 * this.m42);
    var m33 = (mat.m31 * this.m13 + mat.m32 * this.m23
               + mat.m33 * this.m33 + mat.m34 * this.m43);
    var m34 = (mat.m31 * this.m14 + mat.m32 * this.m24
               + mat.m33 * this.m34 + mat.m34 * this.m44);

    var m41 = (mat.m41 * this.m11 + mat.m42 * this.m21
               + mat.m43 * this.m31 + mat.m44 * this.m41);
    var m42 = (mat.m41 * this.m12 + mat.m42 * this.m22
               + mat.m43 * this.m32 + mat.m44 * this.m42);
    var m43 = (mat.m41 * this.m13 + mat.m42 * this.m23
               + mat.m43 * this.m33 + mat.m44 * this.m43);
    var m44 = (mat.m41 * this.m14 + mat.m42 * this.m24
               + mat.m43 * this.m34 + mat.m44 * this.m44);
    
    this.m11 = m11;
    this.m12 = m12;
    this.m13 = m13;
    this.m14 = m14;

    this.m21 = m21;
    this.m22 = m22;
    this.m23 = m23;
    this.m24 = m24;

    this.m31 = m31;
    this.m32 = m32;
    this.m33 = m33;
    this.m34 = m34;

    this.m41 = m41;
    this.m42 = m42;
    this.m43 = m43;
    this.m44 = m44;
    return this ;
}

CanvasMatrix4.prototype.ortho = function(left, right, bottom, top, near, far)
{
    var tx = (left + right) / (left - right);
    var ty = (top + bottom) / (top - bottom);
    var tz = (far + near) / (far - near);
    
    var matrix = new CanvasMatrix4();
    matrix.m11 = 2 / (left - right);
    matrix.m12 = 0;
    matrix.m13 = 0;
    matrix.m14 = 0;
    matrix.m21 = 0;
    matrix.m22 = 2 / (top - bottom);
    matrix.m23 = 0;
    matrix.m24 = 0;
    matrix.m31 = 0;
    matrix.m32 = 0;
    matrix.m33 = -2 / (far - near);
    matrix.m34 = 0;
    matrix.m41 = tx;
    matrix.m42 = ty;
    matrix.m43 = tz;
    matrix.m44 = 1;
    
    this.multRight(matrix);
    return this ;
}

CanvasMatrix4.prototype.frustum = function(left, right, bottom, top, near, far)
{
    var matrix = new CanvasMatrix4();
    var A = (right + left) / (right - left);
    var B = (top + bottom) / (top - bottom);
    var C = -(far + near) / (far - near);
    var D = -(2 * far * near) / (far - near);
    
    matrix.m11 = (2 * near) / (right - left);
    matrix.m12 = 0;
    matrix.m13 = 0;
    matrix.m14 = 0;
    
    matrix.m21 = 0;
    matrix.m22 = 2 * near / (top - bottom);
    matrix.m23 = 0;
    matrix.m24 = 0;
    
    matrix.m31 = A;
    matrix.m32 = B;
    matrix.m33 = C;
    matrix.m34 = -1;
    
    matrix.m41 = 0;
    matrix.m42 = 0;
    matrix.m43 = D;
    matrix.m44 = 0;
    
    this.multRight(matrix);
    return this ;
}

CanvasMatrix4.prototype.perspective = function(fovy, aspect, zNear, zFar)
{
    var top = Math.tan(fovy * Math.PI / 360) * zNear;
    var bottom = -top;
    var left = aspect * bottom;
    var right = aspect * top;
    this.frustum(left, right, bottom, top, zNear, zFar);
    return this ;
}

CanvasMatrix4.prototype.lookat = function(eyex, eyey, eyez, centerx, centery, centerz, upx, upy, upz)
{
    var matrix = new CanvasMatrix4();
    
    // Make rotation matrix

    // Z vector
    var zx = eyex - centerx;
    var zy = eyey - centery;
    var zz = eyez - centerz;
    var mag = Math.sqrt(zx * zx + zy * zy + zz * zz);
    if (mag) {
        zx /= mag;
        zy /= mag;
        zz /= mag;
    }

    // X vector = Y cross Z
    xx =  upy * zz - upz * zy;
    xy = -upx * zz + upz * zx;
    xz =  upx * zy - upy * zx;

    // Recompute Y = Z cross X
    yx = zy * xz - zz * xy;
    yy = -zx * xz + zz * xx;
    yz = zx * xy - zy * xx;

    // cross product gives area of parallelogram, which is < 1.0 for
    // non-perpendicular unit-length vectors; so normalize x, y here

    mag = Math.sqrt(xx * xx + xy * xy + xz * xz);
    if (mag) {
        xx /= mag;
        xy /= mag;
        xz /= mag;
    }

    mag = Math.sqrt(yx * yx + yy * yy + yz * yz);
    if (mag) {
        yx /= mag;
        yy /= mag;
        yz /= mag;
    }

    matrix.m11 = xx;
    matrix.m12 = yx;
    matrix.m13 = zx;
    matrix.m14 = 0;
    
    matrix.m21 = xy;
    matrix.m22 = yy;
    matrix.m23 = zy;
    matrix.m24 = 0;
    
    matrix.m31 = xz;
    matrix.m32 = yz;
    matrix.m33 = zz;
    matrix.m34 = 0;
    
    matrix.m41 = -(xx * eyex + xy * eyey + xz * eyez);
    matrix.m42 = -(yx * eyex + yy * eyey + yz * eyez);
    matrix.m43 = -(zx * eyex + zy * eyey + zz * eyez);
    matrix.m44 = 1;
 //   matrix.translate(-eyex, -eyey, -eyez);
    
    this.multRight(matrix);
    return this ;
}

// Support functions
CanvasMatrix4.prototype._determinant2x2 = function(a, b, c, d)
{
    return a * d - b * c;
}

CanvasMatrix4.prototype._determinant3x3 = function(a1, a2, a3, b1, b2, b3, c1, c2, c3)
{
    return a1 * this._determinant2x2(b2, b3, c2, c3)
         - b1 * this._determinant2x2(a2, a3, c2, c3)
         + c1 * this._determinant2x2(a2, a3, b2, b3);
}

CanvasMatrix4.prototype._determinant4x4 = function()
{
    var a1 = this.m11;
    var b1 = this.m12; 
    var c1 = this.m13;
    var d1 = this.m14;

    var a2 = this.m21;
    var b2 = this.m22; 
    var c2 = this.m23;
    var d2 = this.m24;

    var a3 = this.m31;
    var b3 = this.m32; 
    var c3 = this.m33;
    var d3 = this.m34;

    var a4 = this.m41;
    var b4 = this.m42; 
    var c4 = this.m43;
    var d4 = this.m44;

    return a1 * this._determinant3x3(b2, b3, b4, c2, c3, c4, d2, d3, d4)
         - b1 * this._determinant3x3(a2, a3, a4, c2, c3, c4, d2, d3, d4)
         + c1 * this._determinant3x3(a2, a3, a4, b2, b3, b4, d2, d3, d4)
         - d1 * this._determinant3x3(a2, a3, a4, b2, b3, b4, c2, c3, c4);
}

CanvasMatrix4.prototype._makeAdjoint = function()
{
    var a1 = this.m11;
    var b1 = this.m12; 
    var c1 = this.m13;
    var d1 = this.m14;

    var a2 = this.m21;
    var b2 = this.m22; 
    var c2 = this.m23;
    var d2 = this.m24;

    var a3 = this.m31;
    var b3 = this.m32; 
    var c3 = this.m33;
    var d3 = this.m34;

    var a4 = this.m41;
    var b4 = this.m42; 
    var c4 = this.m43;
    var d4 = this.m44;

    // Row column labeling reversed since we transpose rows & columns
    this.m11  =   this._determinant3x3(b2, b3, b4, c2, c3, c4, d2, d3, d4);
    this.m21  = - this._determinant3x3(a2, a3, a4, c2, c3, c4, d2, d3, d4);
    this.m31  =   this._determinant3x3(a2, a3, a4, b2, b3, b4, d2, d3, d4);
    this.m41  = - this._determinant3x3(a2, a3, a4, b2, b3, b4, c2, c3, c4);
        
    this.m12  = - this._determinant3x3(b1, b3, b4, c1, c3, c4, d1, d3, d4);
    this.m22  =   this._determinant3x3(a1, a3, a4, c1, c3, c4, d1, d3, d4);
    this.m32  = - this._determinant3x3(a1, a3, a4, b1, b3, b4, d1, d3, d4);
    this.m42  =   this._determinant3x3(a1, a3, a4, b1, b3, b4, c1, c3, c4);
        
    this.m13  =   this._determinant3x3(b1, b2, b4, c1, c2, c4, d1, d2, d4);
    this.m23  = - this._determinant3x3(a1, a2, a4, c1, c2, c4, d1, d2, d4);
    this.m33  =   this._determinant3x3(a1, a2, a4, b1, b2, b4, d1, d2, d4);
    this.m43  = - this._determinant3x3(a1, a2, a4, b1, b2, b4, c1, c2, c4);
        
    this.m14  = - this._determinant3x3(b1, b2, b3, c1, c2, c3, d1, d2, d3);
    this.m24  =   this._determinant3x3(a1, a2, a3, c1, c2, c3, d1, d2, d3);
    this.m34  = - this._determinant3x3(a1, a2, a3, b1, b2, b3, d1, d2, d3);
    this.m44  =   this._determinant3x3(a1, a2, a3, b1, b2, b3, c1, c2, c3);
}
//mouse and touch event handler
Pointer = function(t,cb) {
	var self = this ;
	var touch,gesture,EV_S,EV_E,EV_M ;
	function pos(ev) {
		var x,y ;
		if(touch) {
			x = ev.touches[0].pageX - ev.target.offsetLeft ;
			y = ev.touches[0].pageY - ev.target.offsetTop ;
		} else {
			x = ev.offsetX ;
			y = ev.offsetY ;
		}
		return {x:x,y:y} ;
	}
	t.addEventListener("mousedown", startev,false ) ;
	t.addEventListener("touchstart", startev,false ) ;
	function startev(ev) {
		if(gesture) return ;
		if(!EV_S) {
			touch = (ev.type=="touchstart") ;
			setevent() ;
			first = false ;
		}
		self.mf = true ;
		self.dx = self.dy = 0 ;
		self.s = pos(ev) ;
		self.lastd = self.s ;
		if(cb.down) if(!cb.down({sx:self.s.x,sy:self.s.y})) ev.preventDefault() ;	
	}
	function setevent() {
		if(touch) {
			EV_S = "touchstart" ;
			EV_E = "touchend" ;
			EV_O = "touchcancel" ;
			EV_M = "touchmove" ;
		} else {
			EV_S = "mousedown" ;
			EV_E = "mouseup" ;
			EV_O = "mouseout" ;
			EV_M = "mousemove" ;	
		}
		t.addEventListener(EV_E, function(ev) {
			var d = (ev.type=="touchend")?self.lastd:pos(ev) ;
			self.mf = false ;
			if(cb.up) if(!cb.up({ex:d.x,ey:d.y,dx:self.dx,dy:self.dy})) ev.preventDefault() ;
		},false);
		t.addEventListener(EV_O, function(ev) {
			self.mf = false ;
			if(cb.out) if(!cb.out({dx:self.dx,dy:self.dy})) ev.preventDefault() ;
		},false);
		t.addEventListener(EV_M, function(ev) {
			if(gesture) return ;
			var d = pos(ev) ;
			self.lastd = d ;
			if(self.mf) {
				self.dx = (d.x-self.s.x) ;
				self.dy = (d.y-self.s.y) ;
				if(cb.move) if(!cb.move({ox:d.x,oy:d.y,dx:self.dx,dy:self.dy})) ev.preventDefault() ;
			}
		},false)	
	}
	t.addEventListener("contextmenu", function(ev){
		if(cb.contextmenu) {
			if(!cb.contextmenu({px:ev.offsetX,py:ev.offsetY})) ev.preventDefault() ;
		}
	},false ) ;
	t.addEventListener("wheel", function(ev){
		if(cb.wheel) {
			if(!cb.wheel(ev.deltaY)) ev.preventDefault() ;
		}
	},false ) ;
	t.addEventListener("gesturestart", function(ev){
		gesture = true ;
		if(cb.gesture) {
			if(!cb.gesture(0,0)) ev.preventDefault() ;
		}
	})
	t.addEventListener("gesturechange", function(ev){
		if(cb.gesture) {
			if(!cb.gesture(ev.scale,ev.rotation)) ev.preventDefault() ;
		}
	})
	t.addEventListener("gestureend", function(ev){
		gesture = false ;
	})
}
GPad = {conn:false} ;

GPad.init = function() {
	if(!navigator.getGamepads) return false ;
	gamepads = navigator.getGamepads();
//	console.log(gamepads)
	if(gamepads[0]) {
		console.log("connected "+0) ;
		GPad.conn = true ;
	}
	addEventListener("gamepadconnected", function(e) {
		console.log("connected "+e.gamepad.index) ;
		console.log(e.gamepad) ;
		GPad.conn = true; 
	})	
	addEventListener("gamepaddisconnected", function(e) {
		console.log("disconnected "+e.gamepad.index) ;
		GPad.conn = false ;
	})
	return true ;
}
GPad.get = function(pad) {
	if(!GPad.conn) return null ;
	var gamepads = navigator.getGamepads();
	var gp = gamepads[0];
	if(!gp) return null ;
	return gp ;	
}//WBind 
// license MIT
// 2017 wakufactory 
WBind = {} 

WBind.create = function() {
	return new WBind.obj ;
}
WBind.obj = function() {
	this.prop = {} ;
	this._elem = {} ;
	this._check = {} ;
	this._func = {} ;
	this._tobjs = {} ;
}

WBind._getobj = function(elem,root) {
	if(!root) root = document ;
	var e ;
	if(typeof elem == "string") {
		e = root.querySelectorAll(elem) ;
		if(e.length==1) e = e[0] ;
		if(e.length==0) e = null ;
	} else {
		e = elem ;
	}
	return e ;		
}
WBind._getval = function(e) {
	var v = e.value ;
	if(e.type=="checkbox") {
		v = e.checked ;
	}
	if(e.type=="select-multiple") {
		var o = e.querySelectorAll("option") ;
		v = [] ;
		for(var i=0;i<o.length;i++ ) {
			if(o[i].selected) v.push(o[i].value) ;
		}
	}
	if(e.type=="range") v = parseFloat(v) ;
	return v ;		
}

// bind innerHTML
WBind.obj.prototype.bindHtml= function(name,elem,func) {
	var e = WBind._getobj(elem);
	if(!e) return false ;
	this._elem[name] = e ;
	if(!func) func={} ;
	this._func[name] = func ;

	Object.defineProperty(this,name,{
		configurable: true,
		get: function() {
//			WBind.log("get "+name)
			if((e instanceof NodeList || Array.isArray(e))) this.prop[name] = e[0].innerHTML ;
			else this.prop[name] = e.innerHTML ;
			return this.prop[name]  ;
		},
		set:function(val) {
//			WBind.log("set "+name) 
			if(this._func[name].set) val = this._func[name].set(val) ;
			this.prop[name] = val ;
			if((e instanceof NodeList || Array.isArray(e))) {
				for(var i=0;i<e.length;i++) {
//					console.log(this._elem[name][i])
					this._elem[name][i].innerHTML = val 
				}
			} else  this._elem[name].innerHTML = val ;
		}
	})
	if((e instanceof NodeList || Array.isArray(e))) this.prop[name] = e[0].innerHTML ;
	else this.prop[name] = e.innerHTML ;
	return true ;
}
//bind css
WBind.obj.prototype.bindStyle= function(name,elem,css,func) {
	var e = WBind._getobj(elem);
	if(!e) return false ;
	this._elem[name] = e ;
	if(!func) func={} ;
	this._func[name] = func ;	

	Object.defineProperty(this,name,{
		configurable: true,
		get: function() {
//			WBind.log("get "+name)
			if((e instanceof NodeList || Array.isArray(e))) this.prop[name] = e[0].style[css] ;
			else this.prop[name] = e.style[css] ;
			return this.prop[name]  ;
		},
		set:function(val) {
//			WBind.log("set "+name) 
			if(this._func[name].set) val = this._func[name].set(val) ;
			this.prop[name] = val ;
			if((e instanceof NodeList || Array.isArray(e))) {
				for(var i=0;i<e.length;i++) {
					this._elem[name][i].style[css] = val 
				}
			} else this._elem[name].style[css] = val ;
		}
	})
	if((e instanceof NodeList || Array.isArray(e))) this.prop[name] = e[0].style[css] ;
	else this.prop[name] = e.style[css] ;
	return true ;	
}
//bind attribute
WBind.obj.prototype.bindAttr= function(name,elem,attr,func) {
	var e = WBind._getobj(elem);
	if(!e) return false ;
	this._elem[name] = e ;
	if(!func) func={} ;
	this._func[name] = func ;	

	Object.defineProperty(this,name,{
		configurable: true,
		get: function() {
//			WBind.log("get "+name)
			if((e instanceof NodeList || Array.isArray(e))) this.prop[name] = e[0].getAttribute(attr) ;
			else this.prop[name] = e.getAttribute(attr) ;
			return this.prop[name]  ;
		},
		set:function(val) {
//			WBind.log("set "+name) 
			if(this._func[name].set) val = this._func[name].set(val) ;
			this.prop[name] = val ;
			if((e instanceof NodeList || Array.isArray(e))) {
				for(var i=0;i<e.length;i++) {
					this._elem[name][i].setAttribute(attr,val) 
				}
			} else this._elem[name].setAttribute(attr,val) ;
		}
	})
	if((e instanceof NodeList || Array.isArray(e))) this.prop[name] = e[0].getAttribute(attr) ;
	else this.prop[name] = e.getAttribute(attr) ;
	return true ;	
}
// bind input
WBind.obj.prototype.bindInput= function(name,elem,func) {
	var e = WBind._getobj(elem);
	if(!e) return false ;
	if(!func) func={} ;
	this._func[name] = func ;
	if((e instanceof NodeList || Array.isArray(e))&&
		e[0].type!="checkbox"&&e[0].type!="radio") e = e[0] ;
	var exist = (this.prop[name]!=undefined) ;
	this._elem[name] = e ;
	Object.defineProperty(this,name,{
		configurable: true,
		get: function() {
//			this.prop[name] = e.value ;
			var v = _getprop(name) ;
			if(this._func[name].get) v = this._func[name].get(v) ;
			return v  ;
		},
		set:function(val) {
//			WBind.log("set "+name) 
			if(this._func[name].set) val = this._func[name].set(val) ;
			this.prop[name] = val ;
			_setval(name,val) ;
			if(this._func[name].change) this._func[name].change(_getprop(name)) ;
			if(this._func[name].input) this._func[name].input(_getprop(name)) ;
		}
	})
	var self = this ;
	var v = null ;
	
	if((e instanceof NodeList || Array.isArray(e))) {

		if(e[0].type=="checkbox") self._check[name] = {} ;
		for(var i=0;i<e.length;i++) {
			if( typeof e[i] != "object") continue ;
			if(!exist) e[i].addEventListener("change", function(ev) {
				var val ;
				if(this.type=="checkbox" ) {
					self._check[name][this.value] = this.checked ;
					val = _getprop(name);
				}
				else val = this.value ;
				self.prop[name] = val ;
				if(self._func[name].get) val = self._func[name].get(val) ;
				WBind.log("get "+name+"="+val)
				if(self._func[name].change) self._func[name].change(val) ;
			})
			
			if(e[i].type=="radio" && e[i].checked) v = e[i].value ;
			else if(e[i].type=="checkbox" )  {
				self._check[name][e[i].value] = e[i].checked;
			}
		}
		if(e[0].type=="checkbox") v = _getprop(name);
	} else {
		v = WBind._getval(e) ;
		if(!exist) e.addEventListener("change", function(ev) {
			var val = WBind._getval(this) ;
			self.prop[name] = val ;
			if(self._func[name].get) val = self._func[name].get(val) ;
//			WBind.log("get "+name+"="+val)
			if(self._func[name].change) self._func[name].change(val) ;
		})
		if(!exist) e.addEventListener("input", function(ev) {
			var val = WBind._getval(this) ;
			self.prop[name] = val ;
			if(self._func[name].get) val = self._func[name].get(val) ;
	//		WBind.log("get "+name+"="+this.value)
			if(self._func[name].input) self._func[name].input(val) ;
		})
	}
	if(this._func[name].get) v = this._func[name].get(v) ;
	this.prop[name] = v ;
	if(self._func[name].input) this._func[name].input(v) ;
	if(self._func[name].change) this._func[name].change(v) ;


	function _getprop(name) {
		var v ;
		if(self._check[name]) {
			v = [] ;
			for(var i in self._check[name]) {
				if(self._check[name][i]) v.push(i);
			}
			self.prop[name] = v ;
		} else  v = self.prop[name] ;
		return v ;
	}

	function _setval(name,v) {
		var e = self._elem[name] ;
		if(e instanceof NodeList || Array.isArray(e)) {
			if(e[0].type=="radio") {
				for(var i=0;i<e.length;i++ ) {
					if(e[i].value == v) e[i].checked = true ;
				}
			}
			else if(e[0].type=="checkbox") {
				var chk = {} ;
				for(var i=0; i<v.length;i++) {
					chk[v[i]] = true ;
				}
				for(var i=0;i<e.length;i++ ) {
					e[i].checked = chk[e[i].value] ;
				}
				self._check[name] = chk ;
			}
		} 
		else if(e.type=="checkbox") e.checked = v ;
		else if(e.type=="select-multiple") {
			var o = e.querySelectorAll("option") ;
			for(var i=0;i<o.length;i++ ) {
				o[i].selected = false ;
				for(var vi=0;vi<v.length;vi++) {
					if(o[i].value==v[vi]) o[i].selected = true ;
				}
			}			
		}
		else e.value = v ;	
	}
	return true ;
}

WBind.obj.prototype.getCheck = function(name) {
	return this._check[name] ;
}
//set callback function
WBind.obj.prototype.setFunc = function(name,func) {
	for(var f in func) {
		this._func[name][f] = func[f] ;
	}
	var val = WBind._getval( this._elem[name]) ;
	if(this._func[name].get) val = this._func[name].get(val) ;
	this.prop[name] = val ;
	return this._func[name]  ;
}
//bind all input elements
WBind.obj.prototype.bindAllInput = function(base) {
	if(!base) base = document ;
	var o = base.querySelectorAll("input,select,textarea") ;
	var na = {} ;
	for(var i=0;i<o.length;i++) {
		var n = o[i].name ;
		if(na[n]) {
			if(Array.isArray(na[n])) na[n].push(o[i]) ;
			else na[n] = [na[n],o[i]] ;
		} else na[n] = o[i] ;
	}
	for(var i in na) {
		this.bindInput(i,na[i])
	}
	return na ;
}
WBind.obj.prototype.bindAll = function(selector,base) {
	if(base==null) base = document ;
	var b = base.querySelectorAll(selector) ;
	for(var i=0;i<b.length;i++) {
		var name = b[i].getAttribute("data-bind") ;
		if(b[i].tagName=="INPUT"||b[i].tagName=="SELECT") {
			this.bindInput(name,b[i]) ;
		} else {
			this.bindHtml(name,b[i])
		}
	}
}
//bind timer
WBind.obj.prototype.setTimer = function(name,to,ttime,opt) {
	if(!opt) opt = {} ;
	var cd ;
	var sfx = null ;
	if(opt.from) cd = opt.from  ;
	else cd = this[name] ;
	if(isNaN(cd)) {
		if(cd.match(/^([0-9\-\.]+)(.*)$/)) {
			cd = parseFloat(RegExp.$1) ;
			opt.sfx = RegExp.$2 ;
		}
		else cd = 0 ;	
	} ;
	if(cd == to) return ;
	var delay = 0 ;
	if(opt.delay) delay = opt.delay ;
	var now = new Date().getTime() ;
	var o =  {from:cd,to:to,st:now+delay,et:now+delay+ttime,opt:opt} ;
	this._tobjs[name] = o ;
//	WBind.log(o) ;
}
WBind.obj.prototype.clearTimer = function(name) {
	delete(this._tobjs[name])
}
WBind.obj.prototype.updateTimer = function() {
	var now = new Date().getTime() ;
	for(var name in this._tobjs) {
		var o = this._tobjs[name] ;
		if(o==null) continue ;
		
		if(o.st>now) continue ;
		if(o.et<=now) {
			var v = o.to ;
			if(o.opt.sfx) v = v + o.opt.sfx ;
			this[name] = v ;
//			WBind.log("timeup "+o.key) ;
			if(o.opt.efunc) o.opt.efunc(o.to) ;
			delete(this._tobjs[name]) ;
		} else {
			var t = (now-o.st)/(o.et-o.st) ;
			if(o.opt.tfunc) {
				if(typeof o.opt.tfunc =="string") {
					switch(o.opt.tfunc) {
						case "ease-in":
							t = t*t ;
							break ;
						case "ease-out":
							t = t*(2-t) ;
							break ;
						case "ease-inout":
							t = t*t*(3-2*t) ;
							break;
					}
				} else t = o.opt.tfunc(t) ;
			}
			var v = o.from + (o.to-o.from)* t;
			if(o.opt.sfx) v = v + o.opt.sfx ;
//			WBind.log(o.key+"="+v) ;
			this[name] = v ;
		}
	}
}


//utils
WBind.log = function(msg) {
	console.log(msg) ;
}
WBind.addev = function(id,event,fn,root) {
	var e = WBind._getobj(id,root) ;
	if(e) {
		if(!(e instanceof NodeList) && !Array.isArray(e)) e = [e] 
		for(var i=0;i<e.length;i++) {
			e[i].addEventListener(event,function(ev) {
				if(!fn(ev)) ev.preventDefault() ;
			}) ;
		}
	}
}
WBind.set = function(data,root) {
	if(!root) root = document ;
	if(!(data instanceof Array)) data = [data] ;

	for(var i =0;i<data.length;i++) {
		var d = data[i] ;
		var e ;
		if(d.obj) e = WBind._getobj(d.obj,root) ;
		if(d.id) e = root.getElementById(d.id) ;
		if(d.sel) e = root.querySelectorAll(d.sel) ;
		if(!e) continue ;
		if(!(e instanceof NodeList || Array.isArray(e))) e = [e] ;
		for(var ee=0;ee<e.length;ee++ ) {
			if(d.html !=undefined) e[ee].innerHTML = d.html ;
			if(d.value !=undefined) e[ee].value = d.value ;
			if(d.attr !=undefined) e[ee].setAttribute(d.attr,d.value) ;
			if(d.style !=undefined) {
				for(s in d.style) e[ee].style[s] = d.style[s] ;
			}
		}
	}
}
//poxplayer.js
//  PolygonExplorer Player
//   wakufactory.jp
"use strict" ;

var PoxPlayer  = function(can) {
	this.can = document.querySelector(can)  ;
	this.pixRatio = window.devicePixelRatio ;
	var Param = WBind.create() ;
	this.param = Param ;

	Param.bindInput("isStereo","#isstereo") ;
	Param.bindInput("autorot","#autorot") ;
	Param.bindInput("pause","#pause") ;
	Param.bindHtml("fps","#fps") ;
	
	//camera initial
	this.cam = {
		camCX:0,
		camCY:0,
		camCZ:0,
		camVX:0,
		camVY:0,
		camVZ:1,
		camUPX:0,
		camUPY:1,
		camUPZ:0,
		camRX:30,
		camRY:-30,
		camd:5,
		camAngle:60,		//cam angle(deg) 
		camNear:0.01, 	//near
		camFar:1000, 	//far
		sbase:0.05 	//streobase 
	} ;
	// canvas initialize
	this.resize() ;
	window.addEventListener("resize",()=>{this.resize()}) ;
}
PoxPlayer.prototype.resize = function() {
	this.can.width= this.can.offsetWidth*this.pixRatio  ;
	this.can.height = this.can.offsetHeight*this.pixRatio  ;
	console.log("canvas:"+this.can.width+" x "+this.can.height);		
}
PoxPlayer.prototype.load = function(d) {
	return new Promise((resolve,reject) => {
		if(typeof d == "string") {
			var req = new XMLHttpRequest();
			req.open("get",location.search.substr(1),true) ;
			req.responseType = "json" ;
			req.onload = () => {
				if(req.status==200) {
	//				console.log(req.response) ;
					resolve(req.response) ;
				} else {
					relect("Ajax error:"+req.statusText) ;					
				}
			}
			req.onerror = ()=> {
				reject("Ajax error:"+req.statusText)
			}
			req.send() ;		
		} else resolve(d) ;
	})
}
PoxPlayer.prototype.set = function(d) { 
	var m = d.m ;
	var VS = d.vs ;
	var FS = d.fs ;
	// wwg initialize
	var wwg = new WWG() ;
	if(/*!wwg.init2(can) &&*/ !wwg.init(this.can,{preserveDrawingBuffer: true})) {
		alert("wgl not supported") ;
		return null ;
	}
	this.wwg = wwg ;
	this.active = true ;	
	var POX = {src:d,can:this.can} ;
	this.pox = POX ;

	POX.setScene = (scene)=> {
		this.setScene(scene) ;
	}
	try {
		eval(m);
	}catch(err) {
		this.emsg = ("eval error "+err);
		return null ;
	}
	return POX ;
}
PoxPlayer.prototype.stop = function() {
	this.active = false ;
}
PoxPlayer.prototype.cls = function() {
	if(this.render) this.render.clear() ;
}
PoxPlayer.prototype.setError = function(err) {
	this.errCb = err ;
}
PoxPlayer.prototype.setScene = function(sc) {
//	console.log(sc) ;
	var wwg = this.wwg ;
	var pox = this.pox ;
	var can = this.can ;
	var cam = this.cam ;
	var pixRatio = this.pixRatio
	var Param = this.param ;
	sc.vshader = {text:pox.src.vs} ;
	sc.fshader = {text:pox.src.fs} ;
	pox.scene = sc ;
	var sset = pox.setting || {} ;
	if(!sset.scale) sset.scale = 1.0 ;
	cam.camd = 5*sset.scale ;
	if(sset.cam!==undefined) {
		for(var k in sset.cam) {
			cam[k] = sset.cam[k] ;
		}
	}
	pox.cam = cam ;

	//create render unit
	var r = wwg.createRender() ;
	this.render = r ;

	r.setRender(sc).then(()=> {
		
console.log(r) ;
		if(this.errCb) this.errCb("scene set ok") ;
		mouse(cam) ;
		if(window.GPad) GPad.init() ;	
		//draw loop
		var st = new Date().getTime() ;
		var lt = st ;
		var gp ;
		var ft = lt ;
		var fc = 0 ;
		var self = this ;
		(function loop(){
			if(self.active) window.requestAnimationFrame(loop) ;
			if(Param.pause) {
				Param.fps=0;
				return ;
			}
			if(window.GPad && (gp = GPad.get())) {
				cam.camRY += gp.axes[2] ;
				cam.camRX += gp.axes[3] ;
				cam.camd += gp.axes[1]/10 ;
			}
			var ct = new Date().getTime() ;
			var tint = (ct - st) ;
			fc++ ;
//console.log(fc);
			if(ct-ft>=1000) {
				Param.fps = fc ;
				fc = 0 ;
				ft = ct ; 
			}
			if(Param.autorot) cam.camRY += (ct-lt)/100 ;

			update(r,pox,cam,ct) ;
			lt = ct ;
			Param.updateTimer() ;
		})();		
	}).catch((err)=>{
		console.log(err) ;
		if(this.errCb) this.errCb(err) ;
	})
	
	// calc camera matrix
	function camMtx(render,cam,sf) {
		var can = render.wwg.can ;
		var RAD = Math.PI/180 ;
		var dx = sf * cam.sbase * sset.scale ;	// stereo base
		var aspect = can.width/(can.height*((Param.isStereo)?2:1)) ;
		var ret = {};
//console.log(cam);
		if(cam.camMode=="fix") {
			var cx = cam.camVX ;
			var cy = cam.camVY ;
			var cz = cam.camVZ ;
			var upx = cam.camUPX ;
			var upy = cam.camUPY ;
			var upz = cam.camUPZ ;
			var camX = 0 ,camY = 0, camZ = 0 ;			
		}
		else if(cam.camMode=="vr") {
			// self camera mode 
			var cx = Math.sin(cam.camRY*RAD)*1*Math.cos(cam.camRX*RAD)
			var cy = -Math.sin(cam.camRX*RAD)*1 ; 
			var cz = -Math.cos(cam.camRY*RAD)*1*Math.cos(cam.camRX*RAD)
			var camX = 0 ,camY = 0, camZ = 0 ;
			var upx = 0,upy = 1 ,upz = 0 ;		
		} else {
		// bird camera mode 
			var camd=  cam.camd ;
			var camX = -Math.sin(cam.camRY*RAD)*camd*Math.cos(cam.camRX*RAD)
			var camY = Math.sin(cam.camRX*RAD)*camd ; 
			var camZ = Math.cos(cam.camRY*RAD)*camd*Math.cos(cam.camRX*RAD)
			var cx = 0 ,cy = 0, cz = 0 ;
			var upx = 0.,upy = 1 ,upz = 0. ;
		}

		// for stereo
		if(dx!=0) {
			var xx =  upy * (camZ-cz) - upz * (camY-cy);
			var xy = -upx * (camZ-cz) + upz * (camX-cx);
			var xz =  upx * (camY-cy) - upy * (camX-cx);
			var mag = Math.sqrt(xx * xx + xy * xy + xz * xz);
			xx /= mag ; xy /=mag ; xz /= mag ;
			camX += xx*dx ;
			camY += xy*dx ;
			camZ += xz*dx ;
		}
		var camM = new CanvasMatrix4().lookat(camX+cam.camCX,camY+cam.camCY,camZ+cam.camCZ,
		cx+cam.camCX,cy+cam.camCY,cz+cam.camCZ, upx,upy,upz).
			perspective(cam.camAngle,aspect, cam.camNear, cam.camFar)

		return {camX:camX,camY:camY,camZ:camZ,camM:camM} ;
	}
	// calc model matrix
	function modelMtx(render,cam,update) {
		// calc each mvp matrix and invert matrix
		var mod = [] ;		
		for(var i=0;i<render.modelCount;i++) {
			var d = render.getModelData(i) ;
			var m = new CanvasMatrix4(d.bm) ;
			if(d.mm) m.multRight(d.mm) ;
			mod[i] = {
				vs_uni:{
					modelMatrix:new CanvasMatrix4(m).getAsWebGLFloatArray(),
					mvpMatrix:new CanvasMatrix4(m).
						multRight(cam.camM).getAsWebGLFloatArray(),
					invMatrix:new CanvasMatrix4(m).
						invert().transpose().getAsWebGLFloatArray()},
				fs_uni:{eyevec:[cam.camX,cam.camY,cam.camZ]}
			}
		}
		update.model = mod ;
		return update ;		
	}
	// update scene
	function update(render,scene,cam,time) {
		// draw call 
		var camm,update = {} ;
		if(Param.isStereo) {
			render.gl.viewport(0,0,can.width/2,can.height) ;
			if(!Param.pause) update = scene.update(render,cam,time,-1)
			camm = camMtx(render,cam,-1) ;
			if(update.vs_uni==undefined) update.vs_uni = {} ;
			update.vs_uni.stereo = 1 ;
			render.draw(modelMtx(render,camm,update),false) ;
			render.gl.viewport(can.width/2,0,can.width/2,can.height) ;
			if(!Param.pause) update = scene.update(render,cam,time,1)
			camm = camMtx(render,cam,1) ;
			if(update.vs_uni==undefined) update.vs_uni = {} ;
			update.vs_uni.stereo = 2 ;
			render.draw(modelMtx(render,camm,update),true) ;
		} else {
			render.gl.viewport(0,0,can.width,can.height) ;
			if(!Param.pause) update = scene.update(render,cam,time,0)
			camm = camMtx(render,cam,0) ;
			if(update.vs_nui==undefined) update.vs_uni = {} ;
			update.vs_uni.stereo = 0 ;
			render.draw(modelMtx(render,camm,update),false) ;
		}
	}
	// mouse and key intaraction
	var rotX = cam.camRX ,rotY = cam.camRY ;
	var gz = cam.camd ;
	function mouse(cam) {
		//mouse intraction
		var mag = 300*pixRatio /can.width;
		var keymag= 2 ;
		var m = new Pointer(can,{
			down:function(d) {
				if(Param.pause) return true;
				rotX = cam.camRX
				rotY = cam.camRY
				if(pox.event) pox.event("down",{sx:d.sx*pixRatio,sy:d.sy*pixRatio}) ;
				return false ;
			},
			move:function(d) {
				if(Param.pause) return true;
				cam.camRX = rotX+d.dy*mag ;
				cam.camRY = rotY+d.dx*mag ;
				if(cam.camRX>89)cam.camRX=89 ;
				if(cam.camRX<-89)cam.camRX=-89 ;
				if(pox.event) pox.event("move",{ox:d.ox*pixRatio,oy:d.oy*pixRatio,dx:d.dx*pixRatio,dy:d.dy*pixRatio}) ;
				return false ;
			},
			up:function(d) {
				rotX += d.dy*mag ;
				rotY += d.dx*mag; 
				if(pox.event) pox.event("up",{dx:d.dx*pixRatio,dy:d.dy*pixRatio,ex:d.ex*pixRatio,ey:d.ey*pixRatio}) ;
				return false ;
			},
			out:function(d) {
				rotX += d.dy*mag ;
				rotY += d.dx*mag; 
				if(pox.event) pox.event("out",{dx:d.dx*pixRatio,dy:d.dy*pixRatio}) ;
				return false ;
			},
			wheel:function(d) {
				if(Param.pause) return true;
				cam.camd += d/30*sset.scale ;
				if(cam.camd<0) cam.camd = 0 ;
				if(pox.event) pox.event("wheel",d) ;
				return false ;
			},
			gesture:function(z,r) {
				if(Param.pause) return true;
				if(z==0) {
					gz = cam.camd ;
					return false ;
				}
				cam.camd = gz / z ;
				if(pox.event) pox.event("gesture",z) ;
				return false ;
			},
		})
		WBind.addev(window,"keydown", function(ev){
//			console.log("key"+ev.keyCode);
			if(Param.pause) return true ;
			var z = cam.camd ;
			if(ev.altKey) {
				switch(ev.keyCode) {
					case 38:cam.camd = cam.camd - keymag*sset.scale ; if(cam.camd<0) cam.camd = 0 ; break ;
					case 40:cam.camd = cam.camd + keymag*sset.scale ; break ;
				}				
			} else {
				switch(ev.keyCode) {
					case 37:cam.camRY -= keymag ; break ;
					case 38:cam.camRX -= keymag ; if(cam.camRX<-90) cam.camRX = -90 ; break ;
					case 39:cam.camRY += keymag ; break ;
					case 40:cam.camRX += keymag ; if(cam.camRX>90) cam.camRX = 90 ; break ;
				}
			}
			if(pox.event) pox.event("key",ev) ;
			return true ;
		})		
	}
}
PoxPlayer.prototype.GLSLScene = function(sc) {
	return new Promise((resolve,reject) => {

		//create render unit
		var r = wwg.createRender() ;
		this.render = r ;
		r.setRender(sc).then(()=> {
			
		})
	})
	return null ;		
}