var game = new Phaser.Game(288, 505, Phaser.CANVAS, "container");

game.Mystate = {};

//场景一：初始化设置
game.Mystate.boot = {
    preload: function(){
        game.load.image("loading", "assets/preloader.gif");
        if(!game.device.desktop){
            game.scale.scaleMode = Phaser.ScaleManager.EXACT_FIT;
        }
        //水平垂直居中
        game.scale.pageAlignHorizontally = true;
        game.scale.pageAlignVertically = true;
    },
    create: function(){
        game.state.start("load");
    }
}

//场景二：资源加载场景
game.Mystate.load = {
    preload: function(){
        var preloadSprite = game.add.sprite(34, game.height/2, "loading");
        game.load.setPreloadSprite(preloadSprite, 0);//第二个参数值为零意味着雪碧将水平裁剪，值1表示其垂直裁剪。
        game.load.image('background', 'assets/background.png');
        game.load.image('ground', 'assets/ground.png');
        game.load.image('title', 'assets/title.png');
        game.load.spritesheet('bird', 'assets/bird.png', 34, 24, 3);
        game.load.image('btn', 'assets/start-button.png');
        game.load.spritesheet('pipe', 'assets/pipes.png', 54, 320, 2);
        game.load.bitmapFont('flappy_font', 'assets/fonts/flappyfont/flappyfont.png', 'assets/fonts/flappyfont/flappyfont.fnt');
        game.load.audio('fly_sound', 'assets/flap.wav');
        game.load.audio('score_sound', 'assets/score.wav');
        game.load.audio('hit_pipe_sound', 'assets/pipe-hit.wav');
        game.load.audio('hit_ground_sound', 'assets/ouch.wav');
        game.load.image('ready_text', 'assets/get-ready.png');
        game.load.image('play_tip', 'assets/instructions.png');
        game.load.image('game_over', 'assets/gameover.png');
        game.load.image('score_board', 'assets/scoreboard.png');
    },
    create: function(){
        game.state.start("start");
    }
}

//场景三： 游戏开始界面
//小鸟
game.bird = function(x, y){
    bird = game.add.sprite(x, y, "bird");
    bird.animations.add("fei", [0, 1, 2]);
    bird.animations.play("fei", 10, true);
    return bird;
}
game.Mystate.start = {
    create: function(){
        
        //背景
        var bg = game.add.tileSprite(0, 0, game.width, game.height, "background");
        bg.autoScroll( -20, 0);
        //地板
        var ground = game.add.tileSprite(game.width, game.height, game.width, 112, "ground");
        ground.anchor.set(1, 1);
        ground.autoScroll(-80, 0);
        //标题和小鸟组
        var titles = game.add.group();
        titles.create(65, game.height/2 -140, "title");
        //小鸟翅膀震动动画
        titles.add(game.bird(250, game.height/2 -130));
        titles.scale.set(0.8, 0.8);
        //为组增加动画
        game.add.tween(titles).to( { y: 30 }, 2000, Phaser.Easing.Linear.None, true, null, 10000, true);

        //开始的按钮
        var btn = game.add.button(game.width/2, game.height/2, "btn", function(){
            game.state.start("play");
        });
        btn.anchor.set(0.5);
    }
}

//场景四，游戏play页面
var bird;//小鸟
var ground;//地板
var angle = 0;//小鸟旋转角度
var finish = false;//开始旋转
var topp = false;//游戏开始点第一下不触发飞
var pip = false;//控制柱子出现
var pipeTime = 0;
var bg;
var pipeTop;
var pipeUp;
var lastScale = 0;
game.Mystate.play = {
    create: function(){
        game.physics.startSystem(Phaser.Physics.ARCADE);//开启对应物理引擎
        //背景
        bg = game.add.tileSprite(0, 0, game.width, game.height, "background");

        //水管组
        this.pipe1Group = game.add.group();
        this.pipe1Group.enableBody = true;//开启物理引擎
        this.pipe2Group = game.add.group();
        this.pipe2Group.enableBody = true;//开启物理引擎

        //测试组
        this.dangb = game.add.group();

        //地板
        ground = game.add.tileSprite(game.width, game.height, game.width, 112, "ground");
        ground.anchor.set(1, 1);
        game.physics.enable(ground);//开启物理属性
        ground.body.immovable = true;//物体固定不动，即无法给碰开
        ground.bringToTop();
        
        //小鸟
        bird = game.bird(80, 140);
        bird.anchor.set(0.5);
        game.physics.arcade.enable(bird);//开启物理属性

        //TAP
        var tap = game.add.image(game.width/2, ground.y - 150, "play_tip");
        tap.anchor.set(0.5);

        //点击小鸟飞起逻辑
        game.input.onDown.addOnce(function(){
            getReady.kill();
            tap.kill();
            bird.body.gravity.y = 800;
            // bird.body.velocity.y = 10;
            bird.angle = angle;
            finish = true;
            bg.autoScroll(-20, 0);
            ground.autoScroll(-180, 0);
            game.time.events.add(Phaser.Timer.SECOND * 2, function(){
                pip = true;
            }, this);

            game.input.onTap.add(this.jump, this);
            game.input.onUp.add(function(){
                bird.body.velocity.y = 0;
            }, this);
        }, this);

        this.once = true;//游戏结束后出现计分板
        this.onceKnock = true;//水管撞击只响一次音效
        this.floorKnock = true;
        //分数
        this.score = 0;//初始分数
        // this.maxScore = 0;//最大分数
        var style = { font: 'bold 40pt Arial', fill: 'white', align: 'left', wordWrap: true, wordWrapWidth: 450 };
        this.texts = game.add.text(game.world.centerX, 90, this.score, style);
        this.texts.anchor.set(0.5);

        //Get Ready!
        var getReady = game.add.image(game.width/2, 90, "ready_text");
        getReady.anchor.set(0.5);

    },
    update: function(){
        //碰撞检测
        game.physics.arcade.collide(bird, ground, this.overlapHandler, null, this);
        game.physics.arcade.overlap(bird, this.pipe1Group, this.gameOver, null, this);
        game.physics.arcade.overlap(bird, this.pipe2Group, this.gameOver, null, this);
        
        if(finish){
            if(angle <= 90){
                angle += 1;    
            }
            bird.angle = angle;
        }
        if(!bird.inWorld){
            if(this.onceKnock){
                this.hit_pipe_sound = game.add.sound("hit_pipe_sound");
                this.hit_pipe_sound.play();
                this.onceKnock = false;
            }
            this.gameEnd();
        }
        var now = new Date().getTime();
        if(pip && now - pipeTime > 1000){
            var site = game.rnd.integerInRange(-5,5);
            pipeTop = this.pipe1Group.getFirstExists(false, false, "", "", "pipe", 0);
            if(pipeTop){
                pipeTop.reset(game.width, -190+site*15);
                pipeTop.body.velocity.x = -180;
                pipeTop.scl = false;
            }else{
                pipeTop = game.add.sprite(game.width, -190+site*15, "pipe", 0);
                pipeTop.outOfBoundsKill = true;
                pipeTop.checkWorldBounds = true;
                game.physics.arcade.enable(pipeTop);
                pipeTop.body.velocity.x = -180;
                pipeTop.scl = false;                
                this.pipe1Group.add(pipeTop);
            }
            pipeUp = this.pipe2Group.getFirstExists(false, false, "", "", "pipe", 1);
            if(pipeUp){
                pipeUp.reset(game.width, 270+site*15);
                pipeUp.body.velocity.x = -180;
            }else{
                pipeUp = game.add.sprite(game.width, 270+site*15, "pipe", 1);
                pipeUp.outOfBoundsKill = true;
                pipeUp.checkWorldBounds = true;
                game.physics.arcade.enable(pipeUp);
                pipeUp.body.velocity.x = -180;
                this.pipe2Group.add(pipeUp);
            }
            pipeTime = new Date().getTime();
        }

        this.pipe1Group.forEachExists(this.checkScore, this);
    },//update  end
    checkScore: function(pipe){
        if(pipe.x <= (bird.x - game.cache.getImage("bird").width/2-15) && !pipe.scl) {
            this.score += 1;
            this.texts.text = this.score;
            pipe.scl = true;
            //超出世界范围音效
            this.score_sound = game.add.sound("score_sound");
            this.score_sound.play();
            return true; 
        }
        return false;
    },
    jump: function(){
        if(topp){
            this.soundFly = game.add.sound('fly_sound');
            this.soundFly.play();
            bird.body.velocity.y = -300;
            var tween = game.add.tween(bird).to( { angle: -20 }, 200, Phaser.Easing.Bounce.None, true);
            tween.onComplete.add(function(){
                angle = -20;
                bird.angle = -20; 
            }, this);
        }
        topp = true;
        
    },
    gameOver: function(){
        if(this.onceKnock){
            this.hit_pipe_sound = game.add.sound("hit_pipe_sound");
            this.hit_pipe_sound.play();
            this.onceKnock = false;
        }
        this.gameEnd(this.once);
    },
    overlapHandler: function(bird, ground){
        if(this.floorKnock){
            this.hit_pipe_sound = game.add.sound("hit_ground_sound");
            this.hit_pipe_sound.play();
            this.floorKnock = false;
        }  
        this.gameEnd(this.once);
    },
    gameEnd: function(arg){
        if(arg){
            this.once = false;
            var gameOver = game.add.image(game.width/2, 50, "game_over");
            gameOver.anchor.set(0.5);
            this.texts.kill();
            var jifen = game.add.image(game.width/2, 150, "score_board");
            jifen.anchor.set(0.5);

            //最大分数
            if(this.score >= (this.maxScore ? lastScale : 0)){
                this.maxScore = this.score;
                lastScale = this.score;
            }

            var style = { font: 'bold 20pt Arial', fill: 'white', align: 'left', wordWrap: true, wordWrapWidth: 450 };
            var scales = game.add.text(game.world.centerX +70, 142, this.score, style);
            scales.anchor.set(0.5);
            var maxScore = game.add.text(game.world.centerX +70, 190, this.maxScore, style);
            maxScore.anchor.set(0.5);

            var btn = game.add.button(game.width/2, game.height/2, "btn", function(){
                topp = false;
                game.state.start("play");
            });
            btn.anchor.set(0.5);

        }
        finish = false;
        bg.autoScroll(0, 0);
        ground.autoScroll(0, 0);
        bird.animations.stop();
        pip = false;
        this.pipe1Group.setAll('body.velocity.x', "0");
        this.pipe2Group.setAll('body.velocity.x', "0");
        topp = false;
    }
}

game.state.add("boot", game.Mystate.boot);
game.state.add("load", game.Mystate.load);
game.state.add("start", game.Mystate.start);
game.state.add("play", game.Mystate.play);
game.state.start("boot");