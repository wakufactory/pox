//draw canvas from json data
//				2018 wakufactory 
function json2canvas(can) {
	this.canvas = can 
	this.width = can.width
	this.height = can.height 
	this.ctx = can.getContext("2d");
	this.bx = 0
	this.by = 0 
	this.default = {
		font:"20px sans-serif",
		borderColor:"black",
		textColor:"black",
		backgroundColor:"white"
	}
	this.km = /[。、\.\-,)\]｝、〕〉》」』】〙〗〟’”｠»ゝゞーァィゥェォッャュョヮヵヶぁぃぅぇぉっゃゅょゎゕゖㇰㇱㇲㇳㇴㇵㇶㇷㇸㇹㇷ゚ㇺㇻㇼㇽㇾㇿ々〻‐゠–〜～?!‼⁇⁈⁉・:;\/]/
	this.tm = /[(\[｛〔〈《「『【〘〖〝‘“｟«]/
	this.unistr = function(str) {
		this.str = str.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[^\uD800-\uDFFF]/g) || [];
		Object.defineProperty(this,"length",{
			get: ()=>this.str.length
		})
		Object.defineProperty(this,"char",{
			get: ()=>this.str
		})
	}
	this.unistr.prototype.substr = function(i,n) {
		return this.str.slice(i,(n==undefined)?undefined:i+n).join("")
	}
}
json2canvas.prototype.clear = function(clearColor) {
	this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height)
	if(clearColor) {
		clearColor = "white"
		this.ctx.fillStyle = clearColor
		this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height)
	}
}
json2canvas.prototype._ax = function(v) {
	return v + this.bx
}
json2canvas.prototype._ay = function(v) {
	return v + this.by 
}
json2canvas.prototype._aw = function(v) {
	return v 
}
json2canvas.prototype._ah = function(v) {
	return v  
}
json2canvas.prototype.setstyle =function (style){
	
}
json2canvas.prototype.draw =function (data){
	this.ctx.font = this.default.font 
	for(let i=0;i<data.length;i++) {
		const d = data[i]
		let x = 0 ; let y = 0 ;
		let w=10; let h = 10 ;
		if(d.x!=undefined) x = d.x
		if(d.y!=undefined) y = d.y
		if(d.rect) {
			x = d.rect[0] ;y=d.rect[1];w=d.rect[2];h=d.rect[3]
		} 
		this.ctx.save()
		if(d.style==undefined) d.style = {lineWidth:1,boder:this.default.borderColor}
		switch(d.shape) {
			case "box":
				if(d.style.lineWidth) this.ctx.lineWidth = d.style.lineWidth
				if(d.style.background) {
					this.ctx.fillStyle = d.style.background 
					this.ctx.fillRect(this._ax(x),this._ay(y),this._aw(w),this._ah(h))
				}
				if(d.style.border) {
					this.ctx.strokeStyle = d.style.border
					this.ctx.strokeRect(this._ax(x),this._ay(y),this._aw(w),this._ah(h))
				}
				break ;
			case "roundbox":
				const radius = (d.style.radius)?d.style.radius:20 
				this.ctx.beginPath()
				this.ctx.moveTo(this._ax(x+radius),this._ay(y))
				this.ctx.lineTo(this._ax(x+w-radius),this._ay(y))
				this.ctx.arcTo(this._ax(x+w),this._ay(y),this._ax(x+w),this._ay(y+radius),radius)
				this.ctx.lineTo(this._ax(x+w),this._ay(y+h-radius))
				this.ctx.arcTo(this._ax(x+w),this._ay(y)+h,this._ax(x+w-radius),this._ay(y+h),radius)
				this.ctx.lineTo(this._ax(x+radius),this._ay(y+h))
				this.ctx.arcTo(this._ax(x),this._ay(y+h),this._ax(x),this._ay(y+h-radius),radius)
				this.ctx.lineTo(this._ax(x),this._ay(y+radius))
				this.ctx.arcTo(this._ax(x),this._ay(y),this._ax(x+radius),this._ay(y),radius)
				if(d.style.lineWidth) this.ctx.lineWidth = d.style.lineWidth
				if(d.style.background) {
					this.ctx.fillStyle = d.style.background 
					this.ctx.fill()
				}
				if(d.style.border) {
					this.ctx.strokeStyle = d.style.border
					this.ctx.stroke()
				}
				break ;
			case "line":
				
				break ;
			case "text":
				if(d.style.color) this.ctx.fillStyle = d.style.color ;else this.ctx.fillStyle = this.default.textColor
				if(d.style.font) this.ctx.font = d.style.font 
				if(d.style.align) this.ctx.textAlign = d.style.align ; else this.ctx.textAlign  = "left"
				if(d.width) {
					if(d.style.align=="right") x += d.width
					if(d.style.align=="center") x += d.width/2 
				}
				this.ctx.fillText(d.str,this._ax(x),this._ay(y),d.width)
				break ;
			case "textbox":
				let l 
				if(d.str) {
					l = this.boxscan(d)
					data[i].lines = l
				} else if(d.lines) {
					l = d.lines 
				}
				let lh = (d.style.lineHeight!=undefined)?d.style.lineHeight:20
				if(d.style.color) this.ctx.fillStyle = d.style.color ;else this.ctx.fillStyle = this.default.textColor
				if(d.style.font) this.ctx.font = d.style.font 
				if(d.style.align) this.ctx.textAlign = d.style.align ; else this.ctx.textAlign  = "left"
				if(d.style.align=="right") x += w
				if(d.style.align=="center") x += w/2 
				const ox = ((d.style.offsetx!=undefined)?d.style.offsetx:0)
				const oy = ((d.style.offsety!=undefined)?d.style.offsety:0)
				let lx = x - ox
				let ly = y + lh - oy
				this.ctx.rect(this._ax(x),this._ay(x),w,h)
				this.ctx.clip() 
				for(let i=0;i<l.length;i++) {
					this.ctx.fillText(l[i],this._ax(lx),this._ay(ly),w)
					ly += lh 
				}
				break
			case "img":
				this.loadImageAjax(d.src).then((img)=>{
					if(d.width!=undefined && d.height==undefined) {
						w = d.width ; h = d.width * img.height / img.width
					} else 
					if(d.width==undefined && d.height!=undefined) {
						h = d.height ; w = d.heigut * img.width / img.height
					} else
					if(d.width!=undefined && d.height!=undefined) {
						w = d.width ; h = d.height 
					} else {w=img.width;h=img.height}
					this.ctx.drawImage(img,x,y,w,h)			
				})
				break ;
		}
		if(d.children) {
			const bbx = this.bx ; const bby = this.by 
			this.bx = x ; this.by = y 
			this.draw(d.children)
			this.bx = bbx ;this.by = bby 
		}
		this.ctx.restore()
	}
}

json2canvas.prototype.boxscan = function(d) {
	console.log("boxscan")
	let x = d.rect[0] ;let y=d.rect[1];let w=d.rect[2];let h=d.rect[3]
	let str = new this.unistr(d.str)
	this.ctx.save()
	if(d.style.font) this.ctx.font = d.style.font 
	let si =0 
	let lines = [] 

	for(let i =1 ;i<str.length;i++) {
		if(str.char[i] == "\n") {
			lines.push(str.substr(si,i-si))
			i++
			si = i 						
		} else 
		if(this.ctx.measureText(str.substr(si,i-si+1)).width > w) {
			if(str.char[i].match(this.km)) i++
			if(str.char[i-1].match(this.tm)) i--
			lines.push(str.substr(si,i-si))
			si = i				
		}
	}
	if(si<str.length) {
		lines.push(str.substr(si))
	}
	this.ctx.restore()
	return lines
}

json2canvas.prototype.loadImageAjax = function(src) {
	var self = this ;
	return new Promise(function(resolve,reject){
		self.loadAjax(src,{type:"blob"}).then(function(b){
			var timg = new Image ;
			const url = URL.createObjectURL(b);
			timg.onload = function() {
				URL.revokeObjectURL(url)
				resolve(timg) ;
			}
			timg.src = url
		}).catch(function(err){
			resolve(null) ;
		})
	})
}
json2canvas.prototype.loadAjax = function(src,opt) {
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