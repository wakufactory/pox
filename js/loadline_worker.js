// worker for fetch text file each lines
self.onmessage =  function(e) {
	const d = e.data
	const lc = (d.lcount)?d.lcount:1000
	const lbufsize = (d.lbufsize)?d.lbufsize:10000
	const lines = new Array(lc)
	let li = 0  
	loadlines(d.path,l=>{
		lines[li++] = l 
		if(li==lc) {
			self.postMessage( {stat:1,lines:lines})
			li = 0 
		}
	}).then(e=>{
		if(li>0) self.postMessage( {stat:1,lines:lines.slice(0,li)})
		self.postMessage( {stat:0})
	}).catch(e=>{
		self.postMessage({stat:-1,err:e.statusText})
	},lbufsize)
	
}

function loadlines(path,cb,lbufsize) {
	if(!lbufsize) lbufsize = 10000
	const decoder = new TextDecoder
	return new Promise((resolve,reject)=>{
		fetch( path , {
			method:"GET"
		}).then( async resp=>{
			if(resp.ok) {
				const reader = resp.body.getReader();
				const buf = new Uint8Array(lbufsize)
				let bi = 0 
				while (true) {
					const {done, value} = await reader.read();
					if (done) {
					  cb(decoder.decode(buf.slice(0,bi))) 
					  resolve(resp)
					  break;
					}
//					console.log(value.length)
					for (const char of value) {
						buf[bi++] = char 
						if(char == 0x0a ) {
							cb(decoder.decode(buf.slice(0,bi-1))) 
							bi = 0 
						}
					}
				}
			} else {
				reject(resp)
			}
		})
	})
}