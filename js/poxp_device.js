const POXPDevice = {
	VRReady:false,
	isPresenting:false,
	WebXR:false ,
	checkVR:function(poxp) {
		return new Promise( (resolve,reject)=>{
			// for WebXR
			if(navigator.xr) {
				navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
					POXPDevice.VRReady = supported 
					POXPDevice.WebXR = supported 
					resolve(supported)       	
				}).catch((err)=>{
					console.log(err)
					resolve(false)
				});
			} else
			// for WebVR
			if(navigator.getVRDisplays) {
				if(window.VRFrameData!=undefined) POXPDevice.vrFrame = new VRFrameData()
				navigator.getVRDisplays().then((displays)=> {
					console.log("VR init with WebVR")
					POXPDevice.vrDisplay = displays[displays.length - 1]
					console.log(POXPDevice.vrDisplay)
					POXPDevice.VRReady = true 
//					poxp.vrDisplay = POXPDevice.vrDisplay
					window.addEventListener('vrdisplaypresentchange', ()=>{
						console.log("vr presenting= "+POXPDevice.vrDisplay.isPresenting)
						if(POXPDevice.vrDisplay.isPresenting) {
							poxp.callEvent("vrchange",1)
							POXPDevice.isPresenting = true 
						} else {
							poxp.resize() ;
							poxp.callEvent("vrchange",0)
							POXPDevice.isPresenting = false 
						}
					}, false);
					window.addEventListener('vrdisplayactivate', ()=>{
						console.log("vr active")
					}, false);
					window.addEventListener('vrdisplaydeactivate', ()=>{
						console.log("vr deactive")
					}, false);
					resolve(true)
				}).catch((err)=> {
					reject(err)
				})
			} else {
				resolve(false)
			}
		})
	},
	presentVR:function(poxp) {
		return new Promise( (resolve,reject)=>{
			// for WebXR
			if(POXPDevice.WebXR) {
				navigator.xr.requestSession("immersive-vr").then(function(xrSession) {
					POXPDevice.session=xrSession
					POXPDevice.isPresenting = true
					console.log("vr start")
					xrSession.updateRenderState({baseLayer: new XRWebGLLayer(xrSession,poxp.wwg.gl,{framebufferScaleFactor:poxp.pixRatio})});
					xrSession.requestReferenceSpace("local").then((xrReferenceSpace) => {
						POXPDevice.referenceSpace=xrReferenceSpace;
						POXPDevice.session.requestAnimationFrame(POXPDevice.loopf);
						poxp.callEvent("vrchange",1)
					});
					xrSession.addEventListener("end", (ev)=>{
							POXPDevice.session=null
							POXPDevice.isPresenting = false
							console.log("VR end")
//							poxp.loop = window.requestAnimationFrame(POXPDevice.loopf) ;
							poxp.callEvent("vrchange",0)
					})
				});
			} else 
			// for WebVR
			if(POXPDevice.vrDisplay) {
				const p = { source: poxp.can,attributes:{} }
				if(poxp.pox.setting.highRefreshRate!==undefined) p.attributes.highRefreshRate = poxp.pox.setting.highRefreshRate
				if(poxp.pox.setting.foveationLevel!==undefined) p.attributes.foveationLevel = poxp.pox.setting.foveationLevel
				POXPDevice.vrDisplay.requestPresent([p]).then( () =>{
					console.log("present ok")
					const leftEye = POXPDevice.vrDisplay.getEyeParameters("left");
					const rightEye = POXPDevice.vrDisplay.getEyeParameters("right");
					poxp.can.width = Math.max(leftEye.renderWidth, rightEye.renderWidth) * 2;
					poxp.can.height = Math.max(leftEye.renderHeight, rightEye.renderHeight);
					if(POXPDevice.vrDisplay.displayName=="Oculus Go") {
						poxp.can.width = 2560
						poxp.can.height = 1280
					}
					poxp.can.width= poxp.can.width * poxp.pixRatio 
					poxp.can.height= poxp.can.height * poxp.pixRatio 
					poxp.pox.log(POXPDevice.vrDisplay.displayName)
					poxp.pox.log("vr canvas:"+poxp.can.width+" x "+poxp.can.height);
				}).catch((err)=> {
					console.log(err)
				})
			}
		})
	},
	closeVR:function(poxp) {
		// for WebXR
		if(POXPDevice.WebXR) {
			console.log("vr closing")
			POXPDevice.isPresenting = false
			POXPDevice.session.end()
		}
		// for WebVR
		if(POXPDevice.vrDisplay) {
			POXPDevice.vrDisplay.exitPresent().then( () =>{
				console.log("VR end")
			})
		}
	},
	animationFrame:function(poxp,loopf,vrframe) {
		POXPDevice.loopf = loopf 
		if(POXPDevice.isPresenting ) {
			if(!vrframe) return 
			// for WebXR
			if(POXPDevice.WebXR) {
				POXPDevice.session.requestAnimationFrame(loopf);
				POXPDevice.vrFrame = vrframe 
				poxp.isVR = true 
//				console.log("vrframe")
			// for WebVR
			} else if(POXPDevice.vrDisplay && POXPDevice.vrDisplay.isPresenting) {
				poxp.loop = POXPDevice.vrDisplay.requestAnimationFrame(loopf)
				poxp.isVR = true 
			}
		} else {
//			console.log("no vrframe")
			poxp.loop = window.requestAnimationFrame(loopf) ;
			poxp.isVR = false ;
		}
	},
	submitFrame:function(poxp) {
		// for WebXR
		if(POXPDevice.WebXR) {
		}
		// for WebVR
		if(POXPDevice.vrDisplay) {
			if(POXPDevice.vrDisplay.isPresenting) POXPDevice.vrDisplay.submitFrame()
		}
	},
	getFrameData:function(poxp) {
		// for WebXR
		if(POXPDevice.WebXR && POXPDevice.vrFrame) {
//			console.log("getframe")
			let pose=POXPDevice.vrFrame.getViewerPose(POXPDevice.referenceSpace);
//			console.log(pose)
			pose.orientation = [pose.transform.orientation.x,pose.transform.orientation.y,pose.transform.orientation.z,pose.transform.orientation.w]
			pose.position = [pose.transform.position.x,pose.transform.position.y,pose.transform.position.z]
			let frame = {pose:pose}
			let webGLLayer=POXPDevice.session.renderState.baseLayer;
//			console.log(webGLLayer)
			POXPDevice.webGLLayer = webGLLayer
			for (let i=0;i<=pose.views.length-1;i++)
			{
				var viewport=webGLLayer.getViewport(pose.views[i]);
				if(i==1) {
					frame.rightViewMatrix = pose.views[i].transform.inverse.matrix
					frame.rightProjectionMatrix = pose.views[i].projectionMatrix
					frame.rightViewport = viewport 
				} else {
					frame.leftViewMatrix = pose.views[i].transform.inverse.matrix
					frame.leftProjectionMatrix = pose.views[i].projectionMatrix	
					frame.leftViewport = viewport 			
				}
			}
			POXPDevice.viewport = {leftViewport:frame.leftViewport,rightViewport:frame.rightViewport}
//			console.log(frame)
			return frame 
		}
		// for WebVR
		if(POXPDevice.vrDisplay) {
			POXPDevice.vrDisplay.getFrameData(POXPDevice.vrFrame)
			return POXPDevice.vrFrame
		}
	},
	getViewport:function(can) {
		if(POXPDevice.WebXR && POXPDevice.isPresenting)
			return POXPDevice.viewport
		else 
			return {leftViewport:{x:0,y:0,width:can.width/2,height:can.height},
							rightViewport:{x:can.width/2,y:0,width:can.width/2,height:can.height}}
	},
	setDepth:function(camDepth) {
		// for WebXR
		if(!POXPDevice.isPresenting) return
		if(POXPDevice.WebXR) {
			POXPDevice.session.updateRenderState({depthNear:camDepth.camNear, depthFar:camDepth.camFar})
		}
		// for WebVR
		if(POXPDevice.vrDisplay) {
			POXPDevice.vrDisplay.depthNear = camDepth.camNear 
			POXPDevice.vrDisplay.depthFar = camDepth.camFar 
		}
	}
}