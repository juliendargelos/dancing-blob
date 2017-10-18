window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;

var FileApi = function(onplay, onstop, error) {
  var self = this;

  this.input = document.createElement('input');
  this.input.type = 'file';
  this.onplay = typeof onplay === 'function' ? onplay : function() {};
  this.onstop = typeof onstop === 'function' ? onstop : function() {};
  this.error = typeof error === 'function' ? error : function() {};
  this.source = null;
  this.data = null;
  this._file = null;
  this.audioContext = new AudioContext();

  this.input.addEventListener('change', function() {
    var file = this.files[0];
    if(file) {
      self.stop();
      if(file.type.match(/^audio\//) !== null) {
        self.file = this.files[0];
        this.value = null;
      }
      else self.error('Invalid file type');
    }
  });
};

FileApi.prototype = {
  constructor: FileApi,
  defaultSound: 'The Pirouettes - Un Mec en Or (Lewis Ofman remix).mp3',

  get file() {
    return this._file;
  },

  set file(v) {
    if(v instanceof File || (typeof v === 'object' && v !== null && v.default)) {
      this._file = v;
      if(!v.default) this.read();
    }
    else this._file = null;
  },

  default: function() {
    var self = this;

    var request = new XMLHttpRequest();
    request.open('GET', window.encodeURIComponent('sounds/' + this.defaultSound), true);
    request.responseType = 'arraybuffer';
    request.addEventListener('load', function() {
      self.file = {
        name: self.defaultSound,
        default: true
      };

      self.decode(request.response);
    });
    request.send();
  },

  read: function() {
    var self = this;

    var fileReader = new FileReader();
    fileReader.addEventListener('load', function(event) {
      self.decode(event.target.result);
    });

    fileReader.readAsArrayBuffer(this.file);
  },

  decode: function(result) {
    var self = this;

    this.audioContext.decodeAudioData(result, function(buffer) {
      self.play(buffer);
    });
  },

  update: function() {
    this.analyser.getByteFrequencyData(this.data);
  },

  play: function(buffer) {
    var self = this;

    var audioBufferSouceNode = this.audioContext.createBufferSource();
    this.analyser = this.audioContext.createAnalyser();

    this.data = new Uint8Array(this.analyser.frequencyBinCount);

    audioBufferSouceNode.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
    audioBufferSouceNode.buffer = buffer;

    if(!audioBufferSouceNode.start) {
      audioBufferSouceNode.start = audioBufferSouceNode.noteOn;
      audioBufferSouceNode.stop = audioBufferSouceNode.noteOff;
    }

    if(this.source !== null) this.stop();
    audioBufferSouceNode.start(0);

    this.source = audioBufferSouceNode;
    audioBufferSouceNode.addEventListener('ended', function() {
      self.stop();
    });

    this.onplay();
  },

  stop: function() {
    if(this.source !== null) {
      this.source.stop(0);
      this.source = null;
      this.onstop();
    }
  }
};
