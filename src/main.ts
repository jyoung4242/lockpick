import "./style.css";
import { UI } from "@peasy-lib/peasy-ui";
import { Assets } from "@peasy-lib/peasy-assets";
import { Input } from "@peasy-lib/peasy-input";
import { Chance } from "chance";

let chance = new Chance();

enum colors {
  green = "#7FFF00",
  yellow = "#FFD700",
  red = "#8B0000",
}

const model = {
  launch: (event: any, model: any) => {
    model.seed = Math.random() * Date.now();
    chance = new Chance(model.seed);
    model.result = "PENDING";
    model.lockpick.isVisible = !model.lockpick.isVisible;
    model.lockpick.lockPicks = [];
    setTimeout(() => {
      model.lockpick.onLoad(model.level);
    }, 200);
  },
  level: "easy",
  result: "waiting",

  seed: <any>undefined,
  lockpick: {
    victoryStatus: "FAILED",
    solutionAngle: 0,
    solutionRange: 10,
    version: "1.0.1",
    tumblerAngle: 0,
    wrenchAngle: 0,
    mousePosition: { x: 0, y: 0 },
    mouseDragVector: { x: 0, y: 0 },
    dragEnabled: false,
    showTools: false,
    testLock: async () => {
      //wiggle rake
      model.lockpick.wiggle = " wiggle";
      //jiggle lock
      model.lockpick.jiggle = " jiggle";

      const currentAngle = (model.lockpick.wrenchAngle % 360) + 180;
      const targetAngleLow = model.lockpick.solutionAngle - model.lockpick.solutionRange;
      const targetAngleHigh = model.lockpick.solutionAngle + model.lockpick.solutionRange;
      console.log(
        `test- solutionAngle: ${model.lockpick.solutionAngle} wrenchAngle: ${currentAngle} lowlimit: ${targetAngleLow} highlimit: ${targetAngleHigh}`
      );

      await wait(1000);
      model.lockpick.wiggle = "";
      model.lockpick.jiggle = "";

      //evalute current angle against solution limits
      if (currentAngle >= targetAngleLow && currentAngle <= targetAngleHigh) {
        //if within, win
        //do victory routines
        model.lockpick.timeIsRunning = false;
        clearInterval(model.lockpick.timeHandler);
        model.lockpick.timeHandler = 0;
        winGame();
      } else {
        //if not, damage rake (showTools = false)
        //damage flash
        if (model.lockpick.damage == "") {
          //how far away are you?
          let distance = Math.abs(currentAngle - model.lockpick.solutionAngle);
          console.log("distance: ", distance);

          if (distance < 20) model.lockpick.damageColor = colors.green;
          else if (distance >= 20 && distance < 45) model.lockpick.damageColor = colors.yellow;
          else model.lockpick.damageColor = colors.red;

          model.lockpick.damage = " damaged";
          setTimeout(() => {
            model.lockpick.damage = "";
          }, 450);
        }

        //damage health of rake
        damageRake();
        if (model.lockpick.currentLockPick.health <= 0) {
          breakRake();
          //if rake breaks, hide tools
          if (model.lockpick.lockPicks.length == 0) {
            //if last rake breaks, lose
            loseGame();
          }
        }
      }
    },
    tumblerClick: (event: any, model: any) => {
      if (model.lockpick.clickLock) return;
      console.log("pointerdown", event);

      if (!model.lockpick.showTools) {
        model.lockpick.showTools = true;
        model.lockpick.currentLockPick.health = model.lockpick.lockPicks[0].health;
        model.lockpick.wrenchAngle = 0;
        model.lockpick.lockPicks.splice(0, 1);
        if (!model.lockpick.timeIsRunning) model.lockpick.timeCheck();
      }

      if (event.type == "pointerdown") {
        model.lockpick.dragEnabled = true;
        model.lockpick.mousePosition.x = event.x;
        model.lockpick.mousePosition.y = event.y;
      } else if (event.type == "pointerup") {
        model.lockpick.dragEnabled = false;
      }
    },
    tumblerDrag: (event: any, model: any) => {
      if (model.lockpick.clickLock) return;
      if (!model.lockpick.dragEnabled) return;
      console.log("pointermove", event);
      console.log("dragging", event);
      console.log("mouse click position:");
      console.log(event.x - model.lockpick.mousePosition.x, event.y - model.lockpick.mousePosition.y);
      model.lockpick.mouseDragVector.x = event.x - model.lockpick.mousePosition.x;
      model.lockpick.mouseDragVector.y = event.y - model.lockpick.mousePosition.y;

      const mag = Math.sqrt(
        model.lockpick.mouseDragVector.x * model.lockpick.mouseDragVector.x +
          model.lockpick.mouseDragVector.y * model.lockpick.mouseDragVector.y
      );
      console.log("mag: ", mag);
      const ang = rad2ang(Math.atan2(-model.lockpick.mouseDragVector.y, model.lockpick.mouseDragVector.x));
      console.log("angle: ", ang);

      let turnRight = (ang <= 90 && ang >= 0) || (ang >= -90 && ang <= 0);
      if (turnRight) {
        console.log("turnRight");
        model.lockpick.wrenchAngle += mag / 20;
      } else {
        model.lockpick.wrenchAngle -= mag / 20;
        console.log("turnleft");
      }
    },
    isHelpVisible: false,
    damage: "",
    damageColor: colors.red,
    wiggle: "",
    jiggle: "",
    openLock: "",
    showFinalModal: false,
    isVisible: false,
    onLoad: () => {
      model.lockpick.openLock = "";
      model.lockpick.wiggle = "";
      model.lockpick.jiggle = "";
      model.lockpick.damage = "";

      model.lockpick.lockPicks = [];
      //set game defaults for each play
      model.lockpick.showFinalModal = false;
      model.lockpick.isHelpVisible = false;
      model.lockpick.showTools = false;
      model.lockpick.wrenchAngle = 0;
      if (model.lockpick.timeHandler != 0) clearInterval(model.lockpick.timeHandler);
      model.lockpick.timeIsRunning = false;

      let numLockpicks = 0;
      //setup difficulty
      switch (model.level) {
        case "easy":
          numLockpicks = 6;
          model.lockpick.solutionRange = 10;
          model.lockpick.timeremaining = 50;
          break;
        case "med":
          numLockpicks = 5;
          model.lockpick.solutionRange = 6;
          model.lockpick.timeremaining = 30;
          break;
        case "hard":
          numLockpicks = 4;
          model.lockpick.solutionRange = 3;
          model.lockpick.timeremaining = 20;
          break;
        default:
          break;
      }
      for (let index = 0; index < numLockpicks; index++) {
        model.lockpick.lockPicks.push({ health: chance.integer({ min: 3, max: 6 }) });
      }
      model.lockpick.solutionAngle = chance.integer({ min: 0, max: 359 });

      console.log(model.lockpick.solutionAngle);
    },
    timeIsRunning: false,
    gamePaused: false,
    timeHandler: 0,
    timeremaining: 30,
    timeCheck: () => {
      if (!model.lockpick.timeIsRunning) {
        model.lockpick.timeIsRunning = true;
        model.lockpick.timeHandler = setInterval(() => {
          if (model.lockpick.timeremaining == 0) {
            model.lockpick.timeIsRunning = false;
            clearInterval(model.lockpick.timeHandler);
            model.lockpick.timeHandler = 0;
            loseGame();
          } else if (!model.lockpick.gamePaused) model.lockpick.timeremaining--;
        }, 1000);
      }
    },
    clickLock: false,
    lockPicks: <any>[],
    currentLockPick: { health: 3 },
    get getTimeRemaining() {
      if (model.lockpick.timeremaining >= 10) {
        return model.lockpick.timeremaining.toString();
      } else {
        let rtrnSTring = model.lockpick.timeremaining.toString();
        return rtrnSTring.padStart(2, "0");
      }
    },

    showHelp: (event: any, model: any) => {
      if (model.lockpick.clickLock) return;
      model.lockpick.isHelpVisible = !model.lockpick.isHelpVisible;
      //pause timer
      model.lockpick.gamePaused = model.lockpick.isHelpVisible;
    },
    closeGame: () => {
      if (model.lockpick.clickLock) return;
      model.lockpick.isVisible = false;
    },
  },
};
const template = `<div> 
<div class='controls'> 
    <div>Version: \${lockpick.version}</div> 
    <button \${click@=>launch}> launch minigame</button>
    <select>
        <option \${'easy' ==> level}>Easy</option>
        <option \${'med' ==> level}>Medium</option>
        <option \${'hard' ==> level}>Hard</option>
    </select>
    <input class="result" type="text" readonly \${value<==result}></input>  
    <div class="minigame" \${pointerup@=>lockpick.tumblerClick} \${===lockpick.isVisible} style="width:\${lockpick.appwidth}px; --damageColor: \${lockpick.damageColor};">
        <div style="width: 100%;height:10%; "><span class="game_title">Lockpicking</span></div>
        
        <div class="pipFlex">
            <div class="pipButtons" \${click@=>lockpick.closeGame}>Exit</div>
            <div class="pipButtons" \${click@=>lockpick.showHelp}>Help</div>
        </div>
        
        <div class="timerflex">
            <span>Time Remaining</span>
            <span class="timer">0:\${lockpick.getTimeRemaining}</span>
        </div> 
        
        <div class="gameborderTitle">Tumbler</div>
        
        <div class="gameborder">
                <div class="gamebox">
                    <div class="tumblerOuter">
                        <div class="tumblerInner \${lockpick.jiggle} \${lockpick.openLock}" style="transform: rotate(\${lockpick.tumblerAngle}deg);" \${pointerdown@=>lockpick.tumblerClick} \${pointermove@=>lockpick.tumblerDrag}>
                            <div class="rake \${lockpick.damage} \${lockpick.wiggle}" \${===lockpick.showTools} \${click@=>lockpick.testLock}></div>
                            <div class="wrench" \${===lockpick.showTools} style="transform: rotate(\${lockpick.wrenchAngle}deg);"></div>
                        </div>
                    </div>
                    
                </div>
        </div>
    
        <div class="lockpicksborderTitle">Lockpicks Remaining</div>
        <div class="lockpicksRemainingFlex">
            <div class="lockpicksRemainingDiv" \${lp<=*lockpick.lockPicks}></div>    
        </div>
        
        <div class="helpModal" \${===lockpick.isHelpVisible}>
          <div class="helpText">
            <p>Instructions: Objective of game is to turn the lockpick wrench to the correct angle</p>
            <p>Controls: left click on tumbler to start lockpicking, left-click and drag left/right to move wrench</p>
            <p>Controls: left click on lockpick rake to test the lock </p>
            <p>GamePlay: depending on the difficulty level you will get a set amount of time and set amount of picks</p>
            <p>Each pick has a health amount so if you exceed that amount the pick will break if you try too many wrong guesses</p>
            <p>The pick will flash a color if its not the correct angle, and the the color changes depending on how close you are</p>
            
          </div>
        </div>
        
        <div class="finalModal" \${===lockpick.showFinalModal}>
          <div class="modalText">\${lockpick.victoryStatus}</div>
        </div> 
    </div>
</div> 
</div>`;
UI.create(document.body, template, model);

function rad2ang(rad: number): number {
  return (180 / Math.PI) * rad;
}

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function winGame() {
  model.lockpick.openLock = "openLock";
  model.lockpick.clickLock = true;
  model.lockpick.victoryStatus = "SUCCESS";
  model.lockpick.showFinalModal = true;
  model.result = "SUCCEED";
  setTimeout(() => {
    model.lockpick.isVisible = false;
    model.lockpick.lockPicks = [];
    model.lockpick.clickLock = false;
  }, 2500);
}

function damageRake() {
  model.lockpick.currentLockPick.health--;
}

function breakRake() {
  model.lockpick.damage = "damaged";
  model.lockpick.showTools = false;
}

function loseGame() {
  model.lockpick.timeIsRunning = false;
  clearInterval(model.lockpick.timeHandler);
  model.lockpick.timeHandler = 0;
  model.lockpick.clickLock = true;
  model.lockpick.victoryStatus = "FAILED";
  model.lockpick.showFinalModal = true;
  model.result = "FAILED";
  setTimeout(() => {
    model.lockpick.isVisible = false;
    model.lockpick.lockPicks = [];
    model.lockpick.clickLock = false;
  }, 2500);
}
