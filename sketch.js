let mx = 0,
  my = 0,
  touchCountdown = 0;

let CARD_SHEET; // 5250 x 4500; each is 525 x 375

class Card {
  constructor(id, name, age, color, picIndex, tags) {
    this.id = id;
    this.name = name;
    this.age = age;
    this.color = color;
    this.picIndex = picIndex;
    this.tags = tags;

    // special mapping for first 2 rows
    if (id < 15) {
      this.sheetIndex = [
        // row 1
        0, -1, 3, -1, 6, -1, 9, -1, 12, -1,
        // row 2
        1, 2, 4, 5, 7, 8, 10, 11, 13, 14,
      ].indexOf(id);
    } else {
      this.sheetIndex = id + 5;
    }
  }
}

// id starts at 0
const CARDS = [new Card(0, "archery", 1, "red", 2, ["demand", "junk"])];

const getCardImage = {
  full: function (card) {
    // 525 x 375
    const x = card.sheetIndex % 10,
      y = floor(card.sheetIndex / 10);
    return CARD_SHEET.get(x * 525, y * 375, 525, 375);
  },
  pic: function (card) {
    // 111 x 111
    const cimg = this.full(card);
    switch (card.picIndex) {
      case 0:
        return cimg.get(28, 18, 111, 111);
      case 1:
        return cimg.get(28, 243, 111, 111);
      case 2:
        return cimg.get(208, 243, 111, 111);
      case 3:
        return cimg.get(386, 243, 111, 111);
    }
  },
  desc: function (card) {
    // 370 x 155
    const cimg = this.full(card);
    return cimg.get(145, 83, 370, 155);
  },
};

const getCanvasSize = () => {
  const HEIGHT_RATIO = 9 / 6;
  const CANVAS_WIDTH = Math.min(
    window.innerWidth,
    window.innerHeight / HEIGHT_RATIO,
  );
  return [CANVAS_WIDTH, CANVAS_WIDTH * HEIGHT_RATIO];
};

function windowResized() {
  const [w, h] = getCanvasSize();
  resizeCanvas(w, h);
}

async function setup() {
  const [w, h] = getCanvasSize();
  createCanvas(w, h, P2D, document.getElementById("game-canvas"));

  // p5 configs
  textAlign(CENTER, CENTER);
  rectMode(CENTER);
  imageMode(CENTER);
  angleMode(RADIANS);
  strokeJoin(ROUND);
  frameRate(60);

  CARD_SHEET = await loadImage("./cards.jpg");
}

function draw() {
  // rescale canvas and mouse position
  mx = (mouseX * 600) / width;
  my = (mouseY * 600) / width;
  scale(width / 600);

  cursor(ARROW);
  touchCountdown--; // update input delay

  background(20);

  textSize(40);
  fill(255);
  text("ARCHERY", 300, 800);

  // const dummyCard = new Card(floor(frameCount / 10));
  const dummyCard = new Card(63, "aa", 1, "red", 3, []);
  image(getCardImage.full(dummyCard), 525 / 2, 375 / 2, 525, 375);

  image(getCardImage.desc(dummyCard), 300, 500, 370, 155);
  image(getCardImage.pic(dummyCard), 300, 700, 111, 111);
}
