(function(){
function $(e){return document.getElementById(e)}
document.addEventListener("DOMContentLoaded",()=> {
	document.querySelectorAll('div.poxe').forEach((o)=>{
		const src = o.getAttribute("data-src")
		if(!src) return 
		const sb = document.createElement("div")
		sb.innerHTML = "<div class=sbtn>▶︎</div>"
		o.appendChild(sb) ;
		sb.addEventListener("click", (ev)=>{
			ev.target.style.display = "none" ;	
			setpox(o,{src:src,param:o.getAttribute("data-param")})
			document.querySelectorAll('div.poxe').forEach((to)=>{
				if(to!=o && to.poxp) to.poxp.param.pause = true ;
			})
		})
	})
})
function setpox(base,param) {
	const p = `<div class=cc>
 <label><input type=checkbox class=autorot>Rotate</label>
 <label><input type=checkbox class=isStereo>Stereo</label>
 <span class=oswitch><label><input type=checkbox class=pause><span class=sbtn></span></label></span> [<span class=fps></span>fps]
 <div class=pui></div></div>
<div class=loading><img src="guruguru.gif"></div>
<div class=vrbtn></div>
<div class=footer><a href="https://github.com/wakufactory/pox" target="_blank">PoExE</a></div>`
	const div = document.createElement("div")
	div.innerHTML = p 
	base.appendChild(div)
	const can = document.createElement("canvas") 
	base.appendChild(can)
	var poxp = new PoxPlayer(can,{ui:{
		autorot:base.querySelector(".autorot"),
		pause:base.querySelector(".pause"),
		isStereo:base.querySelector(".isStereo"),
		fps:base.querySelector(".fps")}}) ;
	base.poxp = poxp
	var ss ;
	if(param.mode>0) poxp.param.isStereo=true 

	poxp.load(param.src).then(function(src) {
		ss = src ;
		poxp.set(src,{param:param.param}).then(function(pox){
			if(pox.setting.copyright) $("footer").innerHTML += "&nbsp;&nbsp;"+pox.setting.copyright;
			poxp.setParam(base.querySelector('.pui'))
		})
	}).catch(function(err) {
		base.querySelector(".loading").style.display = "none" ;
		alert(err) ;
	})
	poxp.renderStart = function() {
		base.querySelector(".thumb").style.display = "none" ;	
		base.querySelector(".loading").style.display = "none" ;	
	}
	poxp.setError( function(msg) {
		console.log(msg) ;
	})

	base.querySelector(".vrbtn").addEventListener("click", (ev)=>{
		const o = ev.target.closest("div.poxe")
		document.querySelectorAll('div.poxe').forEach((to)=>{
			if(to!=o && to.poxp) to.poxp.param.pause = true ;
		})
		o.poxp.param.pause = false 
		if(!poxp.enterVR()) {
			location.href="view.html?"+param.src
		}
	}) 
}
})()
