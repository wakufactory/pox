//WabAudio wrapper
//  by wakufactory 
var WAS = {
	synth:function(opt) {
		var AC = window.AudioContext ||window.webkitAudioContext;
		if(!AC) {
			this.error = true; 
			return ;
		}
		this.ctx = new AC() ;
		this.mg = this.ctx.createGain() ;
		this.mg.gain.value = 0.2 ;
		this.outnode = this.mg ;
		if(opt && opt.analyse) {
			this.analyser = this.ctx.createAnalyser() ;	
			this.analyser.connect(this.mg) ;
			this.outnode = this.analyser
		}
		if(opt && opt.tone) {
			this.bass = this.ctx.createBiquadFilter() ;
			this.bass.type = "lowshelf" ;
			this.bass.frequency.value = 500 ;
			this.bass.gain.value = 5.0 ;
			this.treble = this.ctx.createBiquadFilter() ;
			this.treble.type = "highshelf" ;
			this.treble.frequency.value = 2000 ;
			this.treble.gain.value = 5.0 ;
			this.bass.connect(this.treble) ;
			this.treble.connect(this.outnode) ;
			this.outnode = this.bass ;
		}
		if(opt && opt.comp) {
			this.comp = this.ctx.createDynamicsCompressor();
			this.comp.connect(this.outnode) ;
			this.outnode = this.comp ;
		}
		this.mg.connect(this.ctx.destination) ;
	},
	ongen:function(synth) {
		this.synth = synth ;
		this.ctx = synth.ctx ;
	}
}
WAS.synth.prototype.close = function() {
	this.ctx.close() ;
}
WAS.synth.prototype.createongen = function(opt) {
	var o = new WAS.ongen(this) ;
	o.init(opt) ;
	return o ;
}
WAS.synth.prototype.copyobj = function(s,d) {
	for(var k in s) {
		if(s[k]!==null && typeof s[k]=="object") {
			if(d[k]===undefined) d[k] = {} ;
			this.copyobj(s[k],d[k]) ;
		}
		else d[k]=s[k] ;
	}
}

WAS.ongen.prototype.init = function(param) {
	this.e1 = this.ctx.createGain() ;
	this.f1 = this.ctx.createBiquadFilter() ;
	this.o1 = this.ctx.createOscillator() ;
	if(param.waveform=="noise") {
		var bufsize = 1024 ;
		this.n1 = this.ctx.createScriptProcessor(bufsize) ;
		this.n1.onaudioprocess = function(ev) {
			var buf0 = ev.outputBuffer.getChannelData(0);
			var buf1 = ev.outputBuffer.getChannelData(1);
			for(var i = 0; i < bufsize; ++i) {
				buf0[i] = buf1[i] = (Math.random() - 0.5) ;
			}
//			console.log("p") ;
		}
		this.o1.connect(this.n1) ;
		this.n1.connect(this.f1) ;
	} else {
		this.o1.connect(this.f1) ;
	}
	this.f1.connect(this.e1) ;
	this.e1.connect(this.synth.outnode) ;
	this.f1.frequency.value = 20000 ;
	this.e1.gain.value = 0 ;
	this.tune = 440 ;
	this.sf = false ;
	
	if(param.lfo_osc) {
		this.l1 = this.ctx.createOscillator() ;
		this.l1g = this.ctx.createGain() ;
		this.l1.connect(this.l1g) ;
		this.l1g.connect(this.o1.frequency) ;
		this.l1.frequency.value = param.lfo_osc.frequency ;
		this.l1.type = param.lfo_osc.waveform ;
		this.l1g.gain.value = param.lfo_osc.level ;
	}
	if(param.lfo_flt) {
		this.l2 = this.ctx.createOscillator() ;
		this.l2g = this.ctx.createGain() ;
		this.l2.connect(this.l2g) ;
		this.l2g.connect(this.f1.frequency) ;
		this.l2.frequency.value = param.lfo_flt.frequency ;
		this.l2.type = param.lfo_flt.waveform ;
		this.l2g.gain.value = param.lfo_flt.level ;
	}
	if(param.lfo_amp) {
		this.l3 = this.ctx.createOscillator() ;
		this.l3g = this.ctx.createGain() ;
		this.lag = this.ctx.createGain() ;
		this.l3.connect(this.l3g) ;
		this.l3g.connect(this.lag.gain) ;
		this.l3.frequency.value = param.lfo_amp.frequency ;
		this.l3.type = param.lfo_amp.waveform ;
		this.l3g.gain.value = param.lfo_amp.level ;
		this.f1.connect(this.lag);
		this.lag.connect(this.e1) ;
	}
	this.opt = {
		'eg':{
			'attack':0.1,
			'decay':0.1,
			'sustain':0.5,
			'release':1.0,
			'maxvalue':1.0,
			'minvalue':0
		}
	};
	this.setopt(param) ;
}

WAS.ongen.prototype.setopt = function(param) {
	if(param) {
		this.synth.copyobj(param,this.opt) ;
	}
//	console.log(this.opt) ;
	if(this.opt.waveform && this.opt.waveform!="noise") this.o1.type = this.opt.waveform ;
	if(this.opt.cutoff) this.f1.frequency.value = this.opt.cutoff ;
	if(this.opt.resonance) this.f1.Q.value = this.opt.resonance ;
	if(this.opt.ftype) this.f1.type = this.opt.ftype ;
	var self = this ;
	this.o1.onended =function(){
		if(self.opt.waveform=="noise") self.n1.disconnect() ;
		if(self.opt.onended)  self.opt.onended.call(self) ;
	}
}

WAS.ongen.prototype.start = function() {
	if(!this.sf) {
		this.o1.start(0) ;
		if(this.l1) this.l1.start(0) ;
		if(this.l2) this.l2.start(0) ;
		if(this.l3) this.l3.start(0) ;
		this.sf = true ;
	}
}

WAS.ongen.prototype.note = function(f,len,time) {
	this.start() ;
	if(time==undefined) time = 0 ;
	if(typeof f =="string") f = this.note2freq(f) ;
	var now=this.ctx.currentTime ;
	if(this.endtime>now) {
		console.log("over") ;
//		return ;
	}
//	console.log(this.opt) ;
	
	this.e1.gain.cancelScheduledValues(0);  // スケジュールを全て解除
	this.o1.frequency.setValueAtTime(f, now) ;
	now = now + time + 0.01;
	this.endtime = this.setenv(this.e1.gain,now,len,this.opt.eg) ;
	
	if(this.opt.eg_osc) {
		this.opt.eg.minvalue = f;
		this.opt.eg.maxvalue = this.opt.eg_osc.minvalue+100 ;
		this.setenv(this.o1.frequency,now,len,this.opt.eg_osc) ;
	}

	if(!this.opt.continuous) {
		this.o1.stop(this.endtime) ;	
	}
}
WAS.ongen.prototype.setenv = function(tgt,now,len,param) {
	tgt.setValueAtTime(param.minvalue, now);
	tgt.linearRampToValueAtTime(param.maxvalue, now + param.attack);
	var sv = (param.maxvalue-param.minvalue)*param.sustain+param.minvalue ;
	tgt.linearRampToValueAtTime(sv, now + param.attack+param.decay);
	tgt.setValueAtTime(sv, now + len);
	endtime = now + len+param.release  ;
	tgt.linearRampToValueAtTime(param.minvalue, endtime );
	return endtime ;
}
WAS.ongen.prototype.note2freq = function(note) {
	var na = {'c':0,'d':2,'e':4,'f':5,'g':7,'a':9,'b':11} ;
	if(note.match(/([CDEFGAB])([#\+\-]*)([0-9]+)/i)) {
		var n = na[RegExp.$1.toLowerCase()] ;
		var m = RegExp.$2 ;
		var o = RegExp.$3 ;
		if(m=="#"||m=="+") n += 1 ;
		if(m=="-") n -= 1 ;
		n = o*12+n ;
		var f = Math.pow(2,(n-57)/12)*this.tune ;
//		console.log(f) ;
		return f ;
	} 
	return null  ;
}

WAS.synth.prototype.showwave = function(can,intv) {
	can = can.getContext('2d') ;
	can.strokeStyle="#fff" ;
	can.fillStyle="#486";
	var w = can.canvas.width ;
	var hw = w/2 ;
	var h = can.canvas.height ;
	var ad = new Uint8Array(512) ;
	var self = this ;
	setInterval(function() {
		self.analyser.getByteTimeDomainData(ad) ;	//波形取得
		can.fillRect(0,0,w,h);
		can.beginPath();
		can.moveTo(0,h/2);
		for(i=0;i<512;i++) {
			can.lineTo(i*hw/512,h-ad[i]*h/256);
		}
		self.analyser.getByteFrequencyData(ad);	//周波数スペクトル取得
		can.moveTo(hw,h);
		var am =0,an= 512 ;
		for(i=0;i<512;i++) {
			if(am<ad[i]) am = ad[i];
			if(an>ad[i]) an = ad[i] ;
			can.moveTo(i*hw/512+hw,h);
			can.lineTo(i*hw/512+hw,h-ad[i]*h/256);
		}
		can.stroke() ;
	},intv);	
}
