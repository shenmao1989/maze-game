"use strict";

class Gene {
  constructor(geneBits, currentPos) {
    this.geneBits = geneBits;            //基因，数组
    this.fitness = 100;
    this.cf = 0;
    this.step = 0;
    this.currentPos = currentPos;
    this.brokenPos = [0, 0];
    this.geneXY = [];
  }
}

class Maze {

  constructor() {
    //最大进化代数
    this.MAX_GENERATION_TIMES = 200;

    //种群数量， 基因的条数
    this.POPULATION_MAX = 240;

    //迷宫起点坐标
    this.START_POS = [0, 0];

    //迷宫的终点
    this.END_POS = [1, 5];

    //基因长度
    this.GENE_LENGTH = 200;

    //杂交比率
    this.XOVER_RATE = 0.7;

    //变异率
    this.MUTATION_RATE = 0.2;

    //迷宫
    this.MAP = [
      [0, 0, 0, 0, 0, 0],
      [1, 1, 1, 1, 1, 0],
      [0, 1, 0, 0, 0, 0],
      [0, 1, 0, 1, 0, 0],
      [0, 1, 0, 0, 0, 1],
      [0, 0, 0, 0, 0, 0]
    ];

    //所有种群
    this.solutions = [];

    //保存最大值结果
    this.maxResult = {

      //保存最大值
      step: 0,

      //最大值对应的基因
      gene: undefined
    };

    //生成初代的染色体
    // this.solutions.push(
    //   new Gene([3,3,3,3,3,1,1,1,2,1,2,2,1,2,2,2,3,1,2,2,2,3,3,1], this.START_POS)
    // );

    this.initmap("map");
    //找到所有的墙壁坐标
    this.walls = [];
    for (let i = 0; i < this.MAP[0].length; i++) {
      for (let j = 0; j < this.MAP.length; j++) {
        if (this.MAP[j][i] == 1) {
          this.walls.push([i, j]);
        }
      }
    }
    while (this.solutions.length < this.POPULATION_MAX) {

      let geneBits = [];
      for (let i = 0; i < this.GENE_LENGTH - this.solutions.length; i++) {
        geneBits.push(Math.floor(Math.random() * 4));
      }
      let gene = new Gene(geneBits, this.START_POS);

      //模拟一个被击破的点
      gene.brokenPos = this.walls[_.random(0, this.walls.length - 1)];

      this.solutions.push(gene);

    }

    //开始进化
    for (let i = 0; i < this.MAX_GENERATION_TIMES; i++) {
      this.envaluateFitness();
      this.selectBetter();
      this.crossover();
      this.mutation();
    }

    this.draw(this.maxResult.gene);
    console.log(this.maxResult.gene.step + '||' + this.maxResult.gene.fitness + '||' + this.maxResult.gene.geneBits.join(','));
  }

  getGeneSolutionValue(gene) {
    // 0 , 1, 2, 3分别表示上下左右
    // 更新基因组的适应性分数

    let geneBits = _.cloneDeep(gene.geneBits);
    // let testPack = [];
    let max_x = this.MAP[0].length - 1;
    let max_y = this.MAP.length - 1;
    let nextpos = null;
    let currentMap = _.cloneDeep(this.MAP);
    let geneXY = [this.START_POS];
    //破除这个墙壁
    currentMap[gene.brokenPos[1]][gene.brokenPos[0]] = 0;
    loop1:
      for (let i = 0; i < geneBits.length; i++) {
        gene.step++;
        let code = parseInt(geneBits[i]);
        let curpos_x = gene.currentPos[0];
        let curpos_y = gene.currentPos[1];

        switch (code) {
          case 0 : // 上
            if (curpos_y > 0) {
              nextpos = [curpos_x, curpos_y - 1];
            } else {
              nextpos = null;
            }

            break;
          case 1 : // 下
            if (curpos_y < max_y) {
              nextpos = [curpos_x, curpos_y + 1];
            } else {
              nextpos = null;
            }
            break;
          case 2 : // 左
            if (curpos_x > 0) {
              nextpos = [curpos_x - 1, curpos_y];
            } else {
              nextpos = null;
            }
            break;
          case 3 : // 右
            if (curpos_x < max_x) {
              nextpos = [curpos_x + 1, curpos_y];
            } else {
              nextpos = null;
            }
            break;
          default:
            break;
        }
        // testPack.push({
        //   code,
        //   nextpos: _.cloneDeep(nextpos)
        // });
        if (nextpos != null && nextpos[1] == this.END_POS[1] && nextpos[0] == this.END_POS[0]) {
          gene.currentPos = nextpos;
          console.log("找到出口", i, geneBits.join(','));
          console.log("找到出口", i, gene.geneBits.join(','));
          console.log("找到出口", i, gene.brokenPos);
          geneXY.push(nextpos);
          // process.exit();
          break loop1;
        } else if (nextpos != null && currentMap[nextpos[1]][nextpos[0]] == 0) { // 可以继续走
          gene.currentPos = nextpos;
          geneXY.push(nextpos);
        } else {
          nextpos = gene.currentPos;
          geneBits[i] = -1;
          gene.step--;
          // testPack.pop();
        }
      }
    //清理无效的步骤, 填充随机步骤
    geneBits = _.filter(geneBits, i => i > -1);
    gene.geneBits = _.fill(geneBits, _.random(0, 3), geneBits.length, gene.geneBits.length);

    gene.fitness = this.getScore(gene);
    gene.currentPos = this.START_POS;
    gene.geneXY =geneXY;
  }

  getScore(gene) {
    let diffx = Math.abs(gene.currentPos[0] - this.END_POS[0]);
    let diffy = Math.abs(gene.currentPos[1] - this.END_POS[1]);

    let s = 0;
    if (diffx + diffy == 0) {
      s = 100000;
    }
    return s - gene.step;
  }


  //计算种群中所有对象的适应度及总和，并对超出C的基因进行“惩罚”。
  envaluateFitness() {
    this.solutions.forEach(gene => {
      this.getGeneSolutionValue(gene);
      // console.log("计算适应度:", gene.fitness.toFixed(3), gene.geneBits.join(","));
      if (!this.maxResult.gene || gene.fitness > this.maxResult.gene.fitness) {            //保存阶段最优值
        this.maxResult.gene = _.cloneDeep(gene);
      }
    });

  }

  //采用简单的轮盘赌方式进行选择，首先计算种群中所有个体的选择概率和累积概率，然后利用随机数进行“轮盘赌”，挑出幸运者作为新种群

  selectBetter() {

    let totalFitness = _.reduce(this.solutions, (result, solution) => {
      return result + solution.fitness;
    }, 0);

    let lastCf = 0;
    let newSolutions = [];
    _.each(this.solutions, (solution) => {
      //计算个体选择概率和累积概率
      solution.rf = solution.fitness / totalFitness;
      solution.cf = lastCf + solution.rf;

      lastCf = solution.cf;
    });

    _.each(this.solutions, (solution, i) => {

      //轮盘赌式选择
      let p = Math.random() * totalFitness;
      if (p < this.solutions[0].cf) {
        newSolutions[i] = _.cloneDeep(this.solutions[0]);
      } else {
        for (let j = 0; j < this.solutions.length - 1; j++) {
          if (p >= this.solutions[j].cf) {
            newSolutions[i] = _.cloneDeep(this.solutions[j + 1]);
            break;
          }
        }
      }
    });

    // console.log("轮盘", JSON.stringify(this.solutions), JSON.stringify(newSolutions));
    this.solutions = newSolutions;
  }

  crossover() {
    let indexs = _.keys(this.solutions);
    let tweens = _.shuffle(indexs).splice(0, 2);
    if (Math.random() < this.XOVER_RATE) {
      this.exChgOver(parseInt(tweens[0]), parseInt(tweens[1]));
    }
  }

  //基因交换函数 , 单点模式
  exChgOver(first, second) {
    let ecc = _.random(0, this.GENE_LENGTH);

    for (let i = 0; i < ecc; i++) {
      // console.log("交叉算子1", this.solutions[first].geneBits.length, this.solutions[first].geneBits);
      // console.log("交叉算子2", this.solutions[second].geneBits.length, this.solutions[second].geneBits);
      let tg = this.solutions[first].geneBits[i];
      this.solutions[first].geneBits[i] = this.solutions[second].geneBits[i];
      this.solutions[second].geneBits[i] = tg;
    }

    //交换破除点
    let bPos = this.solutions[first].brokenPos;
    this.solutions[first].brokenPos = this.solutions[second].brokenPos;
    this.solutions[second].brokenPos = bPos;
  }

  //变异算子采用均匀变异的策略，选中个体基因变异的个数与位置都是随机选择的。
  mutation() {
    _.each(this.solutions, (solution, i) => {
      if (Math.random() < this.MUTATION_RATE) {        //只有当随机数小于变异概率才进行变异操作
        this.reverseGene(i)
      }
    });
  }

  reverseGene(index) {        //变异操作函数
    let mcc = _.random(0, this.GENE_LENGTH - 1);
    // console.log("变异", mcc);
    for (let i = 0; i < mcc; i++) {
      let gi = _.random(0, this.GENE_LENGTH - 1);
      this.solutions[index].geneBits[gi] = 3 - this.solutions[index].geneBits[gi];
    }

    //模拟一个被击破的点
    this.solutions[index].brokenPos = this.walls[_.random(0, this.walls.length - 1)];
  }

  draw(gene) {
    console.log("线路图为", gene.geneBits);
    var ele = document.getElementById("map").getElementsByTagName("div");
    //绘制破除点
    this.addClass(ele[gene.brokenPos[1] * this.MAP[0].length + gene.brokenPos[0]], "box-broken");
    gene.geneBits = gene.geneBits.splice(0, gene.step);

    //剔除重复路线
    let solvedGeneXY = _.cloneDeep(gene.geneXY);

    let i = 0;
    while(solvedGeneXY[i]){
      let currentPos = solvedGeneXY[i];
      let repeatIndex = _.findLastIndex(solvedGeneXY, o=>{
        return o[0] == currentPos[0] && o[1] == currentPos[1];
      });
      if(repeatIndex > i){
        solvedGeneXY.splice(i, repeatIndex - i)
      }
      i++;
    }
    let timer = setInterval(()=>{
      let step = solvedGeneXY.shift();
      if(!step){
        clearInterval(timer);
      } else {
        this.addClass(ele[step[1] * this.MAP[0].length + step[0]], "step");
      }
    }, 200);

  }


  initmap(element) {
    var html = [],
      map = this.MAP;
    for (var i = 0; i < map.length; i++) {
      var row = [];
      for (var j = 0; j < map[i].length; j++) {
        let text = "";
        if(this.START_POS[0] == j && this.START_POS[1] == i){
          text = "始"
        }
        if(this.END_POS[0] == j && this.END_POS[1] == i){
          text = "终"
        }
        row.push('<div class="box' + map[i][j] + '" x=' + j + ' y=' + i + '>'+text+'</div>');
      }
      html.push(row.join(""));
    }
    //console.log(html);
    document.getElementById(element).innerHTML = html.join("");
    document.getElementById(element).style.width = 285 + 'px';

  }
  addClass(obj,className){
    obj.className += " "+className;
  }
}

new Maze();