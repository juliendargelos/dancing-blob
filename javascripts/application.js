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
  amount: 1000,
  fileApi: null,
  frameRequest: null,
  depth: 30,
  rotationOffset: 0,
  spread: 70,
  rotationSpeed: 16,
  persistence: 80,
  points: [],
  easing: 0,
  weight: 2,

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

  get averageMagnitude() {
    var average = 0;
    for(var i = 0; i < this.resolution*2; i++) {
      average += this.fileApi.data[Math.floor(1024 * (i/this.resolution/2))]
    }

    return average/this.resolution/200;
  },

  clear: function(hard) {
    if(hard) this.context.clearRect(0, 0, this.width, this.height);
    this.context.fillStyle = 'rgba(0, 0, 0, '+((100 - this.persistence)/100)+')';
    this.context.fillRect(0, 0, this.width, this.height);
  },

  magnitude: function(offset) {
    return (offset%2 == 0 ? 1 : -1)*this.fileApi.data[Math.floor(1024 * ((offset%this.resolution)/this.resolution))]/100;
  },

  draw: function(offset, averageMagnitude) {
    offset = offset || 0;
    var center = this.center;
    var point, alpha, noise;
    var localTime = (this.time + offset)/3000;
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

      magnitude = averageMagnitude*(this.spread/10) + this.magnitude(i)*(this.radius/4)*(this.depth/10);

      point.x = point.x * (this.radius + magnitude) + center.x;
      point.y = point.y * (this.radius + magnitude) + center.y;

      if(previous) {
        point.x = previous.x + (point.x - previous.x)*((100 - this.easing)/100);
        point.y = previous.y + (point.y - previous.y)*((100 - this.easing)/100);
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
    var averageMagnitude = Math.pow(this.averageMagnitude, 4)*(this.radius/30);
    for(var i = this.amount/10; i >= 0; i--) {
      if(!Array.isArray(this.points[i*10])) this.points[i*10] = [];
      this.draw(i*10, averageMagnitude);
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
  },

  setOptions: function() {
    var self = this;

    var options = document.querySelectorAll('[name^="application."]');
    var option;

    var property = function(input, init) {
      var property = self;
      var properties = input.name.split('.').slice(1);
      for(var i = 0; i < properties.length - 1; i++) property = property[properties[i]];

      if(init === true) input.value = property[properties[properties.length - 1]];
      else {
        value = input.value;

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
    };

    var change = function() {
      property(this);
    };

    for(var i = 0; i < options.length; i++) {
      option = options[i];
      option.addEventListener('change', change);
      option.addEventListener('mousemove', change);
      option.addEventListener('mousedown', change);
      option.addEventListener('mouseup', change);
      property(option, true);
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
