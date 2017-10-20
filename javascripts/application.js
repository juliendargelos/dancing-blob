window.a = 1;

var application = {
  canvas: document.querySelector('canvas'),
  input: document.querySelector('.input'),
  context: null,
  simplex: new SimplexNoise(),
  radius: 300,
  time: 0,
  _fps: 120,
  interval: 0,
  resolution: 7,
  amount: 100,
  fileApi: null,
  frameRequest: null,
  depth: 28,
  rotationOffset: 0,
  spread: 19,
  rotationSpeed: 16,
  persistence: 0.8,
  points: [],
  easing: 68,
  weight: 0.2,
  spacing: 63,
  randomInterval: 5000,
  randomTime: 0,
  random: false,
  currentPreset: 0,

  presets: [
    {resolution:  7, amount: 100, spacing:  63,      depth: 28,      weight: 0.2,    persistence: 0.8    },
    {resolution: 11, amount: 100, spacing:      100, depth:     100, weight: 0.1,    persistence: 70     },
    {resolution: 11, amount:  46, spacing:  59.1927, depth: 26.8282, weight: 1.6409, persistence: 64.5739},
    {resolution:  7, amount:  33, spacing: 159.7141, depth: 38.3915, weight: 0.5152, persistence: 87.2623},
    {resolution:  4, amount:  43, spacing: 122.0377, depth: 31.0550, weight: 0.7440, persistence: 83.8282},
    {resolution: 16, amount:  37, spacing:  65.5285, depth: 45.9127, weight:    0.2, persistence: 74.6503},
    {resolution: 12, amount:  45, spacing:  82.4651, depth: 49.0072, weight: 0.8403, persistence: 72.8060},
    {resolution: 13, amount:  37, spacing: 151.4407, depth: 29.0986, weight: 1.1328, persistence: 83.6287},
    {resolution:  7, amount:   7, spacing: 178.4572, depth: 26.4793, weight: 0.6039, persistence: 53.5809},
    {resolution:  9, amount:  47, spacing:  47.8694, depth: 47.9567, weight:    0.2, persistence: 72.4018},
    {resolution: 17, amount:  47, spacing:  65.2955, depth: 25.4018, weight: 1.3376, persistence: 59.1862},
    {resolution: 11, amount:  42, spacing: 102.5935, depth: 56.0099, weight: 1.7833, persistence: 79.4261},
    {resolution:  7, amount:  25, spacing: 118.3504, depth: 29.3570, weight: 0.7431, persistence: 59.0169},
    {resolution: 10, amount:  44, spacing: 123.8507, depth: 33.6181, weight: 1.3464, persistence: 50.3169},
    {resolution:  8, amount:  48, spacing:  53.1130, depth: 55.3940, weight:    0.2, persistence: 73.6863},
    {resolution:  9, amount:  37, spacing: 143.1152, depth: 46.6835, weight: 0.5583, persistence: 53.3314},
    {resolution:  7, amount:  24, spacing: 160.3217, depth: 27.0821, weight:    0.2, persistence: 87.8387},
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
    return (offset%2 == 0 || absolute ? 1 : -1)*this.fileApi.data[Math.floor(1024 * ((offset%this.resolution)/this.resolution))]/100;
  },

  draw: function(offset, averageMagnitude) {
    offset = offset || 0;
    var center = this.center;
    var point, alpha, noise;
    var localTime = (this.time + offset)/6000;
    var time = (this.time + offset)/3000;
    var points = [];
    var point;
    var rotation = null;
    var previous;

    if(offset === 0 && this.rotationSpeed !== 0) {
      rotation = this.time%(Math.PI*2)/(1000/(this.rotationSpeed/10));
      this.context.translate(center.x, center.y);
      this.context.rotate(rotation);
      this.context.translate(-center.x, -center.y);
    }

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

    if(rotation !== null) {
      this.context.translate(center.x, center.y);
      this.context.rotate(-rotation);
      this.context.translate(-center.x, -center.y);
    }

    this.points[offset] = points;
  },

  render: function() {
    this.clear();

    if(this.random) {
      if(this.time - this.randomTime >= this.randomInterval) {
        this.randomTime = this.time;
        this.currentPreset = (this.currentPreset + 1)%this.presets.length;
        var preset = this.presets[this.currentPreset];
        for(var property in preset) {
          this[property] = preset[property];
          input = document.querySelector('[name="application.' + property + '"]');
          if(input) this.property(input, true);
        }
      }
    }

    var averageMagnitude = Math.pow(this.averageMagnitude(), 4)*(this.radius/30);
    for(var i = this.amount*this.spacing; i >= 0; i -= this.spacing) {
      if(!Array.isArray(this.points[i])) this.points[i] = [];
      this.draw(i, averageMagnitude);
    }
  },

  update: function() {
    if(this.shouldDraw) {
      this.fileApi.update();
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

    this.fileApi = new FileApi(function() {
      self.input.textContent = this.file.name.replace(/^\d+\s/, '').replace(/\.[^\.]+$/, '');
      draw();
    }, function() {
      window.cancelAnimationFrame(self.frameRequest);
      self.input.textContent = 'Choose a song';
      self.clear(true);
    }, function(error) {
      self.input.textContent = error;
    });

    document.body.appendChild(this.fileApi.input);

    document.querySelector('.default').addEventListener('click', function() {
      self.fileApi.default();
    });

    this.input.addEventListener('click', function() {
      self.fileApi.input.click();
    });

    this.setOptions();

    this.resize();

    window.addEventListener('resize', function() {
      self.resize();
    });
  }
}
