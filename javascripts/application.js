window.a = 1;

var application = {
  canvas: document.querySelector('canvas'),
  input: document.querySelector('.input'),
  toggler: document.querySelector('.toggler'),
  hideable: document.querySelectorAll('.hideable'),
  inputs: {},
  context: null,
  simplex: new SimplexNoise(),
  radius: 300,
  time: 0,
  _fps: 120,
  interval: 0,
  resolution: 7,
  amount: 100,
  soundApi: null,
  frameRequest: null,
  depth: 28,
  previousAverageMagnitude: 0,
  spread: 20,
  persistence: 0.8,
  points: [],
  easing: 68,
  weight: 0.2,
  spacing: 63,
  kickThreshold: 2,
  kickInterval: 1000,
  kickTime: 0,
  auto: false,
  transition: {},
  currentPreset: 0,

  presets: [
    {resolution:  7, amount: 100, spacing:  63,      depth: 28,      weight: 0.2,    persistence: 0      },
    {resolution: 11, amount: 100, spacing: 100,      depth: 99,      weight: 0.15,   persistence: 70     },
    {resolution: 20, amount: 100, spacing:  41.5,    depth: 10,      weight: 0.1,    persistence: 75     },
    {resolution: 11, amount:  46, spacing:  59.1927, depth: 26.8282, weight: 1.6409, persistence: 64.5739},
    {resolution:  7, amount:  33, spacing: 159.7141, depth: 38.3915, weight: 0.5152, persistence: 87.2623},
    {resolution:  4, amount:  43, spacing: 122.0377, depth: 31.0550, weight: 0.7440, persistence: 83.8282},
    {resolution: 14, amount:  37, spacing:  65.5285, depth: 45.9127, weight: 0.2,    persistence: 74.6503},
    {resolution: 13, amount:  37, spacing: 151.4407, depth: 29.0986, weight: 1.1328, persistence: 83.6287},
    {resolution:  7, amount:   7, spacing: 178.4572, depth: 26.4793, weight: 0.6039, persistence: 53.5809},
    {resolution: 11, amount: 100, spacing:  63,      depth: 11,      weight: 0.542,  persistence:  0     },
    {resolution: 17, amount:  47, spacing:  65.2955, depth: 25.4018, weight: 1.3376, persistence: 59.1862},
    {resolution: 10, amount:  44, spacing: 123.8507, depth: 33.6181, weight: 1.3464, persistence: 50.3169},
    {resolution:  9, amount:  37, spacing: 143.1152, depth: 46.6835, weight: 0.5583, persistence: 53.3314},
    {resolution:  7, amount:  24, spacing: 160.3217, depth: 27.0821, weight: 0.2,    persistence: 80.8387},
    {resolution: 11, amount:  28, spacing: 130.0620, depth: 27.4930, weight: 1.4740, persistence: 69.5935}
  ],

  get fps() {
    return this._fps;
  },

  set fps(v) {
    this._fps = v;
    this.interval = 1000/this.fps;
  },

  get shouldDraw() {
    var delta = Date.now() - this.time;

    if(delta >= this.interval) {
      this.time += delta;
      return true;
    }
    else return false;
  },

  get width() {
    return this.canvas.width;
  },

  set width(v) {
    this.canvas.width = v;
  },

  get height() {
    return this.canvas.height;
  },

  set height(v) {
    this.canvas.height = v;
  },

  get center() {
    return {
      x: this.width/2,
      y: this.height/2
    };
  },

  getInput: function(property) {
    if(this.inputs[property] === undefined) this.inputs[property] = document.getElementById(property);
    return this.inputs[property];
  },

  averageMagnitude: function(from, to) {
    var average = 0;
    from = (from === undefined ? 0 : from)*this.resolution;
    to = (to === undefined ? 1 : to)*this.resolution;

    for(var offset = from; offset < to; offset++) average += this.magnitude(offset, true);

    return average/(to - from);
  },

  clear: function(hard) {
    if(hard) this.context.clearRect(0, 0, this.width, this.height);
    this.context.fillStyle = 'rgba(0, 0, 0, '+((100 - this.persistence)/100)+')';
    this.context.fillRect(0, 0, this.width, this.height);
  },

  magnitude: function(offset, absolute) {
    return (offset%2 == 0 || absolute ? 1 : -1)*this.soundApi.data[Math.floor(1024 * ((offset%this.resolution)/this.resolution))]/100;
  },

  draw: function(offset, averageMagnitude) {
    offset = offset || 0;
    var center = this.center;
    var point, alpha, noise;
    var localTime = (this.time + offset)/6000;
    var time = (this.time + offset)/3000;
    var points = [];
    var point;
    var previous;

    this.context.strokeStyle = 'rgb(' + [
      Math.min(255, Math.floor(this.simplex.noise2D(localTime, localTime)*128 + 170)),
      Math.min(255, Math.floor(this.simplex.noise2D(localTime + 2, localTime + 2)*128 + 170)),
      Math.min(255, Math.floor(this.simplex.noise2D(localTime + 4, localTime + 4)*128 + 170))
    ].join(',') + ')';

    for(var i = 0; i < this.resolution; i++) {
      previous = this.points[offset][i];
      alpha = Math.PI*2/this.resolution * i;

      point = {
        x: Math.cos(alpha + time),
        y: Math.sin(alpha + time)
      }

      magnitude = averageMagnitude*(this.spread/5) + this.magnitude(i)*(this.radius/4)*(this.depth/10);

      point.x = point.x * (this.radius + magnitude) + center.x;
      point.y = point.y * (this.radius + magnitude) + center.y;

      if(previous) {
        var easing = (100 - this.easing)/100;
        var kick = Math.pow(this.easing/100, this.easing/100);

        var delta = {
          x: point.x - previous.x,
          y: point.y - previous.y
        };

        point.x = previous.x + delta.x*(delta.x > 0 ? easing : kick);
        point.y = previous.y + delta.y*(delta.y > 0 ? easing : kick);
      }

      points.push(point);
    }

    var firstPoint = points[0];
    var lastPoint = points[points.length - 1];

    this.context.beginPath();
    this.context.moveTo(
      (lastPoint.x + firstPoint.x)/2,
      (lastPoint.y + firstPoint.y)/2
    );

    for(var i = 0; i < points.length - 1; i ++) {
      point = points[i];
      this.context.quadraticCurveTo(
        point.x,
        point.y,
        (point.x + points[i + 1].x)/2,
        (point.y + points[i + 1].y)/2
      );
    }

    this.context.quadraticCurveTo(
      lastPoint.x,
      lastPoint.y,
      (lastPoint.x + firstPoint.x)/2,
      (lastPoint.y + firstPoint.y)/2
    );
    this.context.closePath();

    this.context.lineWidth = this.weight;
    this.context.stroke();

    this.points[offset] = points;
  },

  render: function() {
    this.clear();

    var averageMagnitude = Math.pow(this.averageMagnitude(), 4)*(this.radius/30);

    if(this.auto) {
      var kicking = averageMagnitude - this.previousAverageMagnitude > this.kickThreshold;
      this.previousAverageMagnitude = averageMagnitude;

      if(kicking && this.time - this.kickTime >= this.kickInterval) {

        this.kickTime = this.time;
        this.switchPreset();
      }
    }

    for(var i = this.amount*this.spacing; i >= 0; i -= this.spacing) {
      if(!Array.isArray(this.points[i])) this.points[i] = [];
      this.draw(i, averageMagnitude);
    }
  },

  update: function() {
    if(this.shouldDraw) {
      this.soundApi.update();
      this.render();
    }
  },

  resize: function() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.radius = (this.width + this.height)/2*0.2;
  },

  property: function(input, init) {
    var property = this;
    var properties = input.name.split('.').slice(1);
    for(var i = 0; i < properties.length - 1; i++) property = property[properties[i]];

    if(init === true) {
      input[input.type === 'checkbox' ? 'checked' : 'value'] = property[properties[properties.length - 1]];
    }
    else {
      value = input[input.type === 'checkbox' ? 'checked' : 'value'];

      switch(input.getAttribute('data-type')) {
        case 'number':
          value = parseFloat(value);
          break;
        case 'boolean':
          value = ['true', 'on', '1'].includes((value + '').toLowerCase());
          break;
      }

      property[properties[properties.length - 1]] = value;
    }
  },

  switchPreset: function() {
    this.currentPreset = (this.currentPreset + 1)%this.presets.length;
    var preset = this.presets[this.currentPreset];

    for(var property in preset) {
      this[property] = preset[property];
      this.property(this.getInput(property), true);
    }
  },

  setOptions: function() {
    var self = this;

    var options = document.querySelectorAll('[name^="application."]');
    var option;

    var change = function() {
      self.property(this);
    };

    for(var i = 0; i < options.length; i++) {
      option = options[i];
      option.addEventListener('change', change);
      option.addEventListener('mousemove', change);
      option.addEventListener('mousedown', change);
      option.addEventListener('mouseup', change);
      this.property(option, true);
    }
  },

  init: function() {
    var self = this;

    this.context = this.canvas.getContext('2d');
    this.interval = 1000/this.fps;
    this.time = Date.now();

    var draw = function() {
      self.update();

      self.frameRequest = window.requestAnimationFrame(draw);
    };

    this.soundApi = new SoundApi(function() {
      self.input.textContent = this.file.name.replace(/^\d+\s/, '').replace(/\.[^\.]+$/, '');
      draw();
    }, function() {
      window.cancelAnimationFrame(self.frameRequest);
      self.input.textContent = 'Choose a song';
      self.clear(true);
    }, function(error) {
      self.input.textContent = error;
    });

    document.body.appendChild(this.soundApi.input);

    document.querySelector('.default').addEventListener('click', function() {
      self.soundApi.default();
    });

    this.input.addEventListener('click', function() {
      self.soundApi.input.click();
    });

    this.setOptions();

    this.resize();

    window.addEventListener('resize', function() {
      self.resize();
    });

    var hideTimeout = null;
    var hideOver = false;

    var show = function() {
      document.body.style.cursor = null;
      for(var i = 0; i < self.hideable.length; i++) self.hideable[i].className = self.hideable[i].className.replace(/\bhideable--hidden\b/g, '');
    };

    var hide = function() {
      document.body.style.cursor = 'none';
      for(var i = 0; i < self.hideable.length; i++) self.hideable[i].className += ' hideable--hidden'
    };

    var hideLater = function() {
      clearTimeout(hideTimeout);
        hideTimeout = setTimeout(hide, 1500);
    };

    this.canvas.addEventListener('click', function() {
      self.switchPreset();
    });

    window.addEventListener('mousemove', function() {
      if(!hideOver) {
        show();
        hideLater();
      }
    });

    for(var i = 0; i < this.hideable.length; i++) {
      this.hideable[i].addEventListener('mouseover', function() {
        hideOver = true;
        clearTimeout(hideTimeout);
        show();
      });

      this.hideable[i].addEventListener('mouseout', function() {
        hideOver = false;
        hideLater();
      });
    }

    hideLater();
  }
}
