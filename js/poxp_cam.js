// poxplayercamera object
PoxPlayer.prototype.createCamera = function(cam) {
	return new this.Camera(this,cam) ;
}
PoxPlayer.prototype.Camera = class Camera {
constructor(poxp,cam) {
	this.poxp = poxp ;
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
		camRZ:0,
		camd:20,
		camAngle:90,	//cam angle(deg) 
		camWidth:1.0,
		camNear:0.01, 	//near
		camFar:1000, 	//far
		camGyro:true, // use gyro
		gPad:true, //use gpad
		sbase:0.06, 	//streobase 
		moveSpeed:1.3,		// m/sec
		rotAngle:30,
		moveY:false,
		padMoveUD:true,
		padRot:true,
		headVec:[0,0,0]	//head direction
	} ;
	for(let i in cam) {
		this.cam[i] = cam[i] ;
	}

	this.cama = false ; // on animation
	this.rotX = 0 ;
	this.rotY = 0 ;
	this.gev = null ;
	this.gx = 0 ; this.gy = 0 ; this.gz = 0 ;
	this.vcx = 0 ;this.vcy = 0 ; this.vcz=0
	this.vrx = 0 ;this.vry = 0 ; this.vrz=0
	this.keydown = false ;
	this.vr = false ;
	this.camVP = [new CanvasMatrix4(),new CanvasMatrix4()]
	this.camP =  [new CanvasMatrix4(),new CanvasMatrix4()]
	this.camV =  [new CanvasMatrix4(),new CanvasMatrix4()]
	this.vrv =  [new CanvasMatrix4(),new CanvasMatrix4()]
	this.vrp =  [new CanvasMatrix4(),new CanvasMatrix4()]
	this.tempM =  new CanvasMatrix4()
	this.pvy = false 
	this.pvx = false 
//	if(window.VRFrameData!=undefined) this.vrFrame = new VRFrameData()
}
setCam(cam) {
	for(let i in cam) {
		this.cam[i] = cam[i] ;
	}
	this.cama = false 
}
getCam() {
	let bpos = [this.cam.camCX,this.cam.camCY,this.cam.camCZ]
	return {origin:bpos,position:this.cam.campos,head:this.cam.headVec.slice(),hpos:this.cam.position}
}
vrchange(f) {
	if(f) {
		this.cam.camRX = 0
		this.cam.camRZ = 0
	}
}
event(ev,m) {
	const mag = 300*this.poxp.pixRatio /this.poxp.can.width;
	const scale = (this.poxp.pox.setting && this.poxp.pox.setting.scale)? this.poxp.pox.setting.scale :1 ;

//	console.log("cam "+ev+" key:"+m.key)
	switch(ev) {
		case "down":
			this.rotX = this.cam.camRX
			this.rotY = this.cam.camRY
			break ;
		case "move":
			this.cam.camRX = this.rotX+m.dy*mag ;
			this.cam.camRY = this.rotY+m.dx*mag ;
			if(this.cam.camRX>89)this.cam.camRX=89;
			if(this.cam.camRX<-89)this.cam.camRX=-89;
			break ;
		case "up":
			this.rotX += m.dy*mag ;
			this.rotY += m.dx*mag; 
			if(this.gev!==null) {
				this.gx = this.gev.rx - this.rotX ;
				this.gy = this.gev.ry - this.rotY ;
//				console.log(this.gx+"/"+this.gy) ;
			}
			break ;
		case "out":
			this.rotX += m.dy*mag ;
			this.rotY += m.dx*mag; 
			break ;	
		case "wheel":
			this.cam.camd += m/100 * scale ;
			break ;	
		case "gesture":
			if(m.z==0) {
				this.gz = this.cam.camd ; 
				return false ;
			}
			this.cam.camd = this.gz / m.z ;
			break ;	
		case "gyro":
//		console.log(m)
			if(this.keydown || !this.cam.camGyro) return true ;
			if(m.rx===null) return true ;
			this.gev = m ;
			this.cam.camRX = m.rx - this.gx;
			this.cam.camRY = m.ry - this.gy ;
//		console.log(gx+"/"+gy) ;
			if(this.cam.camRX>89)this.cam.camRX=89 ;
			if(this.cam.camRX<-89)this.cam.camRX=-89 ;
			break ;
		case "keydown":
			const z = this.cam.camd ;
			const keymag= this.cam.moveSpeed ;
			let md = "" ;
			this.keydown = true ;
			if(m.altKey) {
				switch(m.key) {
					case "ArrowUp":this.cam.camd = this.cam.camd - keymag; if(this.cam.camd<0) cthis.am.camd = 0 ; break ;
					case "ArrowDown":this.cam.camd = this.cam.camd + keymag ; break ;
				}				
			} else {
				switch(m.key) {
					case "ArrowLeft":
					case "Left":
					case "h":
						this.vry = -keymag ;
						break ;
					case "ArrowUp":
					case "Up":
					case "k":
						this.vrx = -keymag ;
						break ;
					case "ArrowRight":
					case "Right":
					case "l":
						this.vry = keymag ;
						break ;
					case "ArrowDown":
					case "Down":
					case "j":
						this.vrx = keymag ;
						break ;
				
					case "w":
						md = "f" ; break ;
					case "s":
						md = "b" ;break ;
					case "a":
						md = "l" ;break ;
					case "d":
						md = "r" ;break ;	
					case "q":
						md = "u" ;break ;
					case "e":
						md = "d" ;break ;
				}
			}
			if(md!="") {
				const dir = ((md=="b"||md=="d")?-1:1)*keymag*scale 
				const cam = this.cam ;
				if(md=="u"||md=="d") {
					this.vcy = dir ;
				} else {
					let ry = cam.camRY ;
					if(md=="l") ry = ry -90 ;
					if(md=="r") ry = ry +90 ;
					this.vcx =  Math.sin(ry*RAD) *dir ;
					this.vcz = -Math.cos(ry*RAD)* dir ;						
				}
			}
			break ;
		case "keyup":
			this.keydown = false ;
			if(this.gev!==null) {
				this.gx = this.gev.rx - this.cam.camRX ;
				this.gy = this.gev.ry - this.cam.camRY ;
//				console.log(this.gx+"/"+this.gy) ;
			}
			switch(m.key) {
				case "ArrowLeft":
				case "Left":
				case "h":
				case "ArrowRight":
				case "Right":
				case "l":
					this.vry = 0 ; break ;
				case "ArrowUp":
				case "Up":
				case "k":
				case "ArrowDown":
				case "Down":
				case "j":
					this.vrx = 0  ; break ;
				case "w":
				case "d":
				case "a":
				case "s":
				case " ":
					this.vcx = 0 ; this.vcz = 0 ; break ;
				case "q":
				case "e":
					this.vcy = 0 ;break ;
				case "Dead": //mobile safari no keyup key
					this.vrx = 0 ; this.vry = 0 ; this.vcx = 0 ; this.vcz = 0 ; 
					break ;
			}			
			break ;	
		}
}
update(time) {
	const ft = (this.poxp.ctime - this.poxp.ltime)/1000
//console.log(ft)
	if(this.cam.camMode!="fix") {
		this.cam.camRX += this.vrx ;
		if(this.cam.camRX<-89) this.cam.camRX = -89 ; 
		if(this.cam.camRX>89) this.cam.camRX = 89 ; 
		this.cam.camRY += this.vry ;
	}
	if(this.cam.camMode=="walk") {
		if(!this.cama) {
			this.cam.camCX += this.vcx *ft ;
			this.cam.camCY += this.vcy *ft ;
			this.cam.camCZ += this.vcz *ft ;
		}
		this.cam.camRY += this.vry *ft ;
	}
	if(this.cama) {
		this.cam.camCX += this.acx *ft ;
		this.cam.camCY += this.acy *ft ;
		this.cam.camCZ += this.acz *ft ;	
		this.ad += this.av * ft 
		if( this.ad > this.al ) {
			this.cam.camCX = this.aex
			this.cam.camCY = this.aey
			this.cam.camCZ = this.aez
			this.cama = false 
		}
	}
}
setPad(gpad,gpad2) {
	let gp = gpad?gpad:gpad2
	if(!gp) return 
	if(this.cam.camMode=="walk") {
		let axes = [gp.axes[0],gp.axes[1]]
		if(gp.axes[2]!=undefined && gp.axes[2]!=0) axes[0] = gp.axes[2]
		if(gp.axes[3]!=undefined && gp.axes[3]!=0) axes[1] = gp.axes[3]
		if(this.cam.padMoveUD && gp.buttons[1] && gp.buttons[1].pressed) {
			this.vcy = -axes[1]*this.cam.moveSpeed
			this.pvy = true ;
			return
		} else if(this.pvy) {
			this.vcy = 0 
			this.pvy = false
		}
		let m = gp.buttons[2] && gp.buttons[2].pressed
		let mv = (m)?this.cam.moveSpeed*5:this.cam.moveSpeed
		if(Math.abs(axes[0])<Math.abs(axes[1]) && Math.abs(axes[1])>0 ) {
				this.vcx = -this.cam.headVec[0] * axes[1]*mv
				if(this.cam.moveY) this.vcy = -this.cam.headVec[1] * axes[1]*mv
				this.vcz = -this.cam.headVec[2] * axes[1]*mv
				this.pvx = true
				return 
		} else if(this.pvx) {		
				this.vcx = 0 
				this.vcy = 0
				this.vcz = 0 
				this.pvx = false 
		}
		if(this.cam.padRot && gp.dpad[0]>0) {
			this.cam.camRY += ((axes[0]>0)?1:-1) * this.cam.rotAngle
		}
	}
}
moveTo(x,y,z,opt) {
	if(this.cama) return 
	let cx = (x!==null)?x:this.cam.camCX
	let cy = (y!==null)?y:this.cam.camCY
	let cz = (z!==null)?z:this.cam.camCZ 
	if(opt && opt.velocity) {
		let vx = cx - this.cam.camCX 
		let vy = cy - this.cam.camCY 
		let vz = cz - this.cam.camCZ
		let l = opt.velocity / Math.hypot(vx,vy,vz)
		vx *= l , vy *= l, vz *= l
		this.acx = vx 
		this.acy = vy
		this.acz = vz
		this.aex = cx 
		this.aey = cy 
		this.aez = cz
		this.al = opt.velocity/l
		this.ad = 0 
		this.av = opt.velocity 
		this.cama = true 
	} else {
		this.cam.camCX = cx 
		this.cam.camCY = cy 
		this.cam.camCZ = cz 
		this.cama = false 
	}
}
moveCancel() {
	this.cama = false 
}
getMtx(scale,sf) {
	const cam = this.cam ;
	const can = this.poxp.render.wwg.can ;

	const aspect = can.width/(can.height*((sf)?2:1)) ;
	const cams = [];
//console.log(cam);
//console.log(cam.camRX+"/"+cam.camRY) ;
	let cx,cy,cz,ex,ey,ez,upx,upy,upz,camd ;
	let vrFrame = null
	upx = cam.camUPX ;
	upy = cam.camUPY ;
	upz = cam.camUPZ ;	
	ex =[0,0], ey=[0,0],ez=[0,0] ;
	if(!this.poxp.isVR) {
		if(cam.camMode=="fix") {
			cx = cam.camVX ;
			cy = cam.camVY ;
			cz = cam.camVZ ;
			this.cam.headVec = [cx,cy,cz,0]
		}
		else if(cam.camMode=="vr" || cam.camMode=="walk") {
			// self camera mode 
			cx = cam.camCX + Math.sin(cam.camRY*RAD)*1*Math.cos(cam.camRX*RAD)
			cy = cam.camCY + -Math.sin(cam.camRX*RAD)*1 ; 
			cz = cam.camCZ + -Math.cos(cam.camRY*RAD)*1*Math.cos(cam.camRX*RAD)	
			let cmat = new Mat4().rotate(-this.cam.camRX,1,0,0).rotate(-this.cam.camRY,0,1,0).rotate(-this.cam.camRZ,0,0,1)
			upx = Math.sin(cam.camRZ*RAD)
			upy = Math.cos(cam.camRZ*RAD)
			this.cam.headVec = cmat.multVec4(0,0,-1,0)
		} else  {
		// bird camera mode 
			camd=  cam.camd*scale ;
			cam.camCX  = -Math.sin(cam.camRY*RAD)*camd*Math.cos(cam.camRX*RAD)
			cam.camCY = Math.sin(cam.camRX*RAD)*camd ; 
			cam.camCZ = Math.cos(cam.camRY*RAD)*camd*Math.cos(cam.camRX*RAD)
			cx = 0 ,cy = 0, cz = 0 ;
			if(camd<0) {
				cx = cam.camCX*2 ;cy = cam.camCY*2 ;cz = cam.camCZ*2 ;
			}
			let l = Math.hypot(cam.camCX,cam.camCY,cam.camCZ)
			this.cam.headVec = [-cam.camCX/l,-cam.camCY/l,-cam.camCZ/l,0] 
		}
		this.cam.campos = [cam.camCX,cam.camCY,cam.camCZ]

		this.camVP[0].makeIdentity()
		this.camVP[1].makeIdentity()
		this.camP[0].makeIdentity()
		this.camP[1].makeIdentity()
		this.camV[0].makeIdentity()
		this.camV[1].makeIdentity()
			
		if(sf) {		// for stereo
			const dx = -cam.sbase * scale ;	// stereo base
			ex[0] =  upy * (cam.camCZ-cz) - upz * (cam.camCY-cy);
			ey[0] = -upx * (cam.camCZ-cz) + upz * (cam.camCX-cx);
			ez[0] =  upx * (cam.camCY-cy) - upy * (cam.camCX-cx);
			const mag = Math.hypot(ex[0],ey[0],ez[0]);
			ex[0] *= dx/mag ; ey[0] *=dx/mag ; ez[0] *= dx/mag ;
			ex[1] = -ex[0] ; ey[1] = -ey[0] ; ez[1] = -ez[0] ;
	//			console.log(dx+":"+xx+"/"+xy+"/"+xz)
			this.camV[0].lookat(ex[0]+cam.camCX, ey[0]+cam.camCY, ez[0]+cam.camCZ, cx+ex[0], cy+ey[0], cz+ez[0], upx,upy,upz) ;
			this.camV[1].lookat(ex[1]+cam.camCX, ey[1]+cam.camCY, ez[1]+cam.camCZ, cx+ex[1], cy+ey[1], cz+ez[1], upx,upy,upz) ;

			if(cam.camAngle!=0) this.camP[0].perspective(cam.camAngle,aspect, cam.camNear, cam.camFar)
			else this.camP[0].pallarel(cam.camd,aspect, cam.camNear, cam.camFar) ;
			this.camP[1] = this.camP[0]
			this.camVP[0].load(this.camV[0]).multRight(this.camP[0])
			this.camVP[1].load(this.camV[1]).multRight(this.camP[1])
		} else {
			this.camV[0].lookat(cam.camCX, cam.camCY, cam.camCZ, cx, cy, cz, upx,upy,upz) ;
			if(cam.camAngle!=0) this.camP[0].perspective(cam.camAngle,aspect, cam.camNear, cam.camFar)
			else this.camP[0].pallarel(cam.camd,aspect, cam.camNear, cam.camFar) ;
			this.camVP[0].load(this.camV[0]).multRight(this.camP[0])
		}
	}
	if(this.poxp.isVR) {
		
		POXPDevice.setDepth({camNear:cam.camNear,camFar:cam.camFar})

		vrFrame = POXPDevice.getFrameData()
//		console.log(vrFrame)
		if(!vrFrame) return 
		this.cam.orientation = vrFrame.pose.orientation
		this.cam.position = vrFrame.pose.position
		if(!this.cam.position) this.cam.position = [0,0,0]
		this.vrv[1].load(vrFrame.rightViewMatrix)
		this.vrv[0].load(vrFrame.leftViewMatrix)
		this.vrp[1].load(vrFrame.rightProjectionMatrix)
		this.vrp[0].load(vrFrame.leftProjectionMatrix)
 
		this.tempM.makeIdentity()
			.translate(-cam.camCX,-cam.camCY,-cam.camCZ)
//			.translate(-this.cam.position[0],0,-this.cam.position[2])
			.rotate(cam.camRX,1,0,0)
			.rotate(cam.camRY,0,1,0)
			.rotate(cam.camRZ,0,0,1)
//			.translate(this.cam.position[0],0,this.cam.position[2])

		this.camV[0].load(this.vrv[0])
		if(this.leftCorrMtx) this.camV[0].multRight(this.leftCorrMtx)
		this.camV[0].multLeft( this.tempM )
		this.camVP[0].load(this.camV[0]).multRight(this.vrp[0]) 
		this.camP[0].load(this.vrp[0])
		
		this.camV[1].load(this.vrv[1])
		if(this.rightCorrMtx) this.camV[1].multRight(this.rightCorrMtx)
		this.camV[1].multLeft( this.tempM )
		this.camVP[1].load(this.camV[1]).multRight(this.vrp[1]) 
		this.camP[1].load(this.vrp[1])
		
		let cx =0,cy =0,cz=1
		if(this.cam.orientation ) {
			let x = this.cam.orientation[0] ;
			let y = this.cam.orientation[1] ;
			let z = this.cam.orientation[2] ;
			let w = this.cam.orientation[3] ;
			cx = 2*(-x*z-y*w) 
			cy = 2*(-y*z+x*w)
			cz = (x*x+y*y-z*z-w*w)
			let l = Math.hypot(cx,cy,cz)
			cx /= l ,cy /=l, cz /= l 
		}
		let cmat = new Mat4().rotate(-this.cam.camRX,1,0,0).rotate(-this.cam.camRY,0,1,0)
		this.cam.headVec = cmat.multVec4(cx,cy,cz,0)
		cmat.translate(cam.camCX,cam.camCY,cam.camCZ)
		this.cam.campos = cmat.multVec4(this.cam.position[0],this.cam.position[1],this.cam.position[2],1)

		let ivr = new Mat4().load(this.camV[1]).invert() ;
		let ivl = new Mat4().load(this.camV[0]).invert() ;
		ex[0] = ivl.buf[12] -cam.camCX
		ey[0] = ivl.buf[13] -cam.camCY
		ez[0] = ivl.buf[14] -cam.camCZ 
		ex[1] = ivr.buf[12] -cam.camCX
		ey[1] = ivr.buf[13] -cam.camCY
		ez[1] = ivr.buf[14] -cam.camCZ
	}
//	console.log(camVP)
	return [{camX:cam.camCX+ex[0],camY:cam.camCY+ey[0],camZ:cam.camCZ+ez[0], 
		camV:this.camV[0],camVP:this.camVP[0],camP:this.camP[0], vrFrame:vrFrame},
	{camX:cam.camCX+ex[1],camY:cam.camCY+ey[1],camZ:cam.camCZ+ez[1],
		camV:this.camV[1],camVP:this.camVP[1],camP:this.camP[1],vrFrame:vrFrame}] ;
}
} // class Camera
