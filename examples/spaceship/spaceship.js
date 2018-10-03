/***
 * Excerpted from "Reactive Programming with RxJS",
 * published by The Pragmatic Bookshelf.
 * Copyrights apply to this code. It may not be used to create training material,
 * courses, books, articles, and the like. Contact us if you are in doubt.
 * We make no guarantees that this code is fit for any purpose.
 * Visit http://www.pragmaticprogrammer.com/titles/smreactjs for more book information.
***/
var canvas = document.createElement('canvas');
var ctx = canvas.getContext("2d");
document.body.appendChild(canvas);
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

function isVisible(obj) {
  return obj.x > -40 && obj.x < canvas.width + 40 &&
    obj.y > -40 && obj.y < canvas.height + 40;
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function paintStars(stars) {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  stars.forEach(star => {
    ctx.fillRect(star.x, star.y, star.size, star.size);
  });
}

function gameOver(ship, enemies) {
  return enemies.some(enemy => {
    if (collision(ship, enemy)) {
      paintGameOver();
      return true;
    }

    return enemy.shots.some(shot => {
      paintGameOver();
      return collision(ship, shot);
    });
  });
}

function collision(target1, target2) {
  return (target1.x > target2.x - 20 && target1.x < target2.x + 20) &&
    (target1.y > target2.y - 20 && target1.y < target2.y + 20);
}

function paintScore(score) {
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('Score: ' + score, 40, 43);
}

function paintGameOver() {
  ctx.fillStyle = '#ff0000';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText('Game Over!', canvas.width/2, canvas.height/2);
}

function drawTriangle(x, y, width, color, direction) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - width, y);
  ctx.lineTo(x, direction === 'up' ? y - width : y + width);
  ctx.lineTo(x + width, y);
  ctx.lineTo(x - width, y);
  ctx.fill();
}

function paintSpaceShip(x, y) {
  drawTriangle(x, y, 20, '#ff0000', 'up');
}

function paintEnemies(enemies) {
  enemies.forEach(function (enemy) {
    enemy.y += 5;
    enemy.x += getRandomInt(-15, 15);

    if (!enemy.isDead) {
      drawTriangle(enemy.x, enemy.y, 20, '#00ff00', 'down');
    }
    else {
      console.log('hit!');
    }
    enemy.shots.forEach(function (shot) {
      shot.y += SHOOTING_SPEED;
      drawTriangle(shot.x, shot.y, 5, '#00ffff', 'down');
    });
  });
}

var SHOOTING_SPEED = 15;
var SCORE_INCREASE = 15;
function paintHeroShots(heroShots, enemies) {
  heroShots.forEach(function (shot) {
    try { var enemies_length = enemies.length }
    catch (err) { var enemies_length = 0 }
    for (let l = 0; l < enemies_length || 0; l++) {
      let enemy = enemies[l];
      if (!enemy.isDead && collision(shot, enemy)) {       
        ScoreSubject.onNext(SCORE_INCREASE);
        enemy.isDead = true;      
        shot.x = shot.y = -100;
        break;
      }
    }
    // console.log('len: ', enemies.length);
    shot.y -= SHOOTING_SPEED;
    drawTriangle(shot.x, shot.y, 5, '#ffff00', 'up');
  });
}

var SPEED = 40;
var STAR_NUMBER = 250;
var StarStream = Rx.Observable.range(1, STAR_NUMBER)
  .map(()=> {
    return {
      x: parseInt(Math.random() * canvas.width),
      y: parseInt(Math.random() * canvas.height),
      size: Math.random() * 3 + 1
    };
  })  
  .toArray()
  .flatMap(function (starArray) {
    return Rx.Observable.interval(SPEED).map(function () {
      starArray.forEach(star=> {
        if (star.x >= canvas.width) {
          star.x = 0;
        }
        star.x += 3;
        /*
        if (star.y >= canvas.height) {
          star.y = 0;
        }
        star.y += 3;
        */
      });
      return starArray;
    });
  });

var HERO_Y = canvas.height - 30;
var mouseMove = Rx.Observable.fromEvent(canvas, 'mousemove');
var SpaceShip = mouseMove
  .map(function (event) { return { x: event.clientX, y: HERO_Y }; })
  .startWith({ x: canvas.width / 2, y: HERO_Y });

function isVisible(obj) {
  return obj.x > -40 && obj.x < canvas.width + 40 &&
    obj.y > -40 && obj.y < canvas.height + 40;
}

var ENEMY_FREQ = 1500;
var ENEMY_SHOOTING_FREQ = 750;
var Enemies = Rx.Observable.interval(ENEMY_FREQ)
  .scan(function (enemyArray) {
    var enemy = {
      x: parseInt(Math.random() * canvas.width),
      y: -30,
      // not suer if this is required
      // isDead: false,
      shots: []
    };

    Rx.Observable.interval(ENEMY_SHOOTING_FREQ).subscribe(() => {
      if (!enemy.isDead) {
        enemy.shots.push({ x: enemy.x, y: enemy.y });
      }
      enemy.shots = enemy.shots.filter(isVisible);
    });

    enemyArray.push(enemy);
    return enemyArray
      .filter(isVisible)
      .filter((enemy) => {
        return !(enemy.isDead && enemy.shots.length === 0);
      });
  }, []);

var playerFiring = Rx.Observable
  .merge(
    Rx.Observable.fromEvent(document, 'click'),
    Rx.Observable.fromEvent(document, 'keydown')
      .filter(evt => evt.keyCode === 32)
  )
  .sample(200)
  .timestamp();

var HeroShots = Rx.Observable
  .combineLatest(
    playerFiring,
    SpaceShip,
    function (shotEvents, spaceShip) {
      return {
        timestamp: shotEvents.timestamp,
        x: spaceShip.x
      };
    })
  .distinctUntilChanged(shot => { return shot.timestamp; })
  .scan((shotArray, shot) => {
    shotArray.push({ x: shot.x, y: HERO_Y });
    return shotArray;
  }, []);

var ScoreSubject = new Rx.BehaviorSubject(0);
var score = ScoreSubject.scan((prev, cur) => {
  return prev + cur;
}, 0).concat(Rx.Observable.return(0));

function renderScene(actors) {
  paintStars(actors.stars);
  paintSpaceShip(actors.spaceship.x, actors.spaceship.y);
  paintEnemies(actors.enemies);
  console.log('enemies: ', actors.enemies.length);
  paintHeroShots(actors.heroShots, actors.enemies);
  paintScore(actors.score);
}

Rx.Observable.combineLatest(
  StarStream, SpaceShip, Enemies, HeroShots, score,
  function (stars, spaceship, enemies, heroShots, score) {
    return {
      stars: stars,
      spaceship: spaceship,
      enemies: enemies,
      heroShots: heroShots,
      score: score
    };
  })
  .sample(SPEED)
  .takeWhile(function (actors) {
    return gameOver(actors.spaceship, actors.enemies) === false;
  })
  .subscribe(renderScene);
