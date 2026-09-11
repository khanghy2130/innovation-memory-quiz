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
const CARDS = [new Card(0, "ARCHERY", 1, "RED", 2, ["demand", "junk"])];

const getCardImage = {
  full: (card) => {
    const x = card.sheetIndex % 10,
      y = floor(card.sheetIndex / 10);
    return CARD_SHEET.get(x * 525, y * 375, 525, 375);
  },
  name: (card) => {},
  pic: (card) => {
    const cimg = this.getCardFromSheet(card);
    // return cimg.get()
  },
  desc: (card) => {
    const cimg = this.getCardFromSheet(card);
    // return cimg.get()
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

  textSize(50);
  fill(255);
  text("text", 300, 100);

  const dummyCard = new Card(floor(frameCount / 10));
  image(getCardImage.full(dummyCard), 300, 500, 525, 375);
}
