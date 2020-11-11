jQuery(function() {
    console.log( "ready!" );

    var lastUrl = null;


    setInterval(function () {
        if (lastUrl != document.location.href) {
            console.log('URL CHANGE');
            lastUrl =  document.location.href;
            setTimeout(changeUrl, 10000);
        }
    }, 1000);

});

var events = [];
var timers = [];
var observers = [];

function changeUrl() {
    //reset timer and event
    events.forEach(function (timer) {
        clearInterval(timer);
    });
    timers = [];
    observers.forEach(function (observe) {
        observe.disconnect();
    });
    observers = [];

    if($('.menu-entry.lastBattles').length > 0) {
        return lastBattle();
    }
}

function lastBattle() {
    console.log('last battle');
    var game = window.location.pathname.split('/')[3];
    console.log(window.codingame);
    var userId = window.codingame.session.userId;
    var handle = null;

    var score = 0;


    var compileScore = function (games) {
        let win = 0;
        let total = 0;
        let notFinalised = false;
        games.forEach(function (game) {
            if (!game.done) {
                notFinalised = true;
                return;
            }
            total++;
            if (game.players[0].userId == userId) {
                win++;
            }
        });

        score = total == 0 ? 0 : (Math.round((win / total) * 10000) / 100);

        let head = $('.cg-ide-last-battles .ranking .last-battles-header');
        let scoreEl = head.find('.score');
        scoreEl.length > 0 ? scoreEl.text('(' + score + '%)') : head.append('<span class="score">(' + score + '%)</span>');

        if (notFinalised) {
            setTimeout(getResult, 5000);
        }
        console.log('SCORE '  + score);
    };

    var getResult = function(){
        let el = $('.cg-ide-last-battles .ranking');
        if (el.length == 0) {
            return;
        }

        $.ajax({
            url:'/services/gamesPlayersRanking/findLastBattlesByTestSessionHandle',
            type:"POST",
            data:JSON.stringify([handle, null ]),
            contentType:"application/json; charset=utf-8",
            dataType:"json",
            success: compileScore
        });
    };

    $.ajax({
        url:'/services/Puzzle/generateSessionFromPuzzlePrettyId',
        type:"POST",
        data:JSON.stringify([userId, game, false ]),
        contentType:"application/json; charset=utf-8",
        dataType:"json",
        success: function(result){
            handle = result.handle;
        }
    });

    let targetNode = $(".menu-entry.lastBattles button").get(0);
    let observer = new MutationObserver(getResult);
    observer.observe(targetNode, { attributes: true, childList: false, subtree: false });
    observers.push(observer);


    /*var lastBattleOpen = function(el){
        console.log('Last battle compile');
        console.log( el.find('.battle-done').length);
        $( document ).ajaxComplete(function(el) {
           console.log('ajax request', el);
        });
        el.find('.battle-done').each(function() {
            //console.log(this);
        });

    };


    timers.push(setInterval(function(){
        let el = $('.cg-ide-last-battles .ranking [vs-repeat]')
        if (el.length > 0) {
            lastBattleOpen(el);
        }
    }, 5000));*/
}