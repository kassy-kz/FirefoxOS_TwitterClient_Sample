/**
 * 画面を開いた時に最初に処理される部分
 */
window.onload = function () {

    var twitterManager = new TwitterManager();
    var domManager = new DomManager();

    /**
     * 更新ボタンをおした時のハンドラ
     */
    $("#updateButton").click(function () {
        // 一旦全てのツイートを消す
        domManager.clearTweetDom();
        // HomeTimelineを取得する
        twitterManager.getHomeTimeline();
    });

    /**
     * 更新ボタンをおした時のハンドラ
     */
    $("#getMoreButton").click(function () {
        // HomeTimelineを取得する
        twitterManager.getHomeTimelineMore();
    });

    /**
     * 投稿ボタンをおした時のハンドラ
     */
    $("#statusUpdateButton").click(function () {
        // 新規ツイート投稿を行う
        twitterManager.newTweetPost();
    });

    // OAuth関連の処理を開始する
    twitterManager.firstOAuthFunc();


    $("#newPostButton").click(function () {
        document.querySelector('#newTweetSection').className = 'current';
        document.querySelector('[data-position="current"]').className = 'left';
        //$("section[data-position='current']").className = "left";
    });
    $("#backButton").click(function () {
        document.querySelector('#newTweetSection').className = 'right';
        document.querySelector('[data-position="current"]').className = 'current';
    });

    $('.fileArea').on({
        click: function(e){ $('input').trigger("click"); }
    });
    $('input').change(function(){
        $('.fileName').text($(this).val());
    });
};


var TwitterManager = (function () {

    // thisを指すオブジェクト（コールバック内でthisが使えないため）
    var self;

    // OAuthオブジェクト
    var oauth;

    var domManager


    /**
     * コンストラクタ
     */
    function TwitterManager() {
        self = this;
        domManager = new DomManager();
    }

    /**
     * OAuth関連の最初の処理を行うメソッド
     */
    TwitterManager.prototype.firstOAuthFunc = function (meters) {

        // 最初にOAuthオブジェクトに喰わせる値たち
        var config = {
            consumerKey:"YOUR_CONSUMER_KEY",
            consumerSecret:"YOUR_CONSUMER_SECRET",
            requestTokenUrl:"https://api.twitter.com/oauth/request_token",
            authorizationUrl:"https://api.twitter.com/oauth/authorize",
            accessTokenUrl:"https://api.twitter.com/oauth/access_token"
        };

        // OAuthのオブジェクトを作成
        oauth = new OAuth(config);

        // 保存してあるアクセストークンがあればそれをロードする
        var accessTokenKey = localStorage.getItem("accessTokenKey");
        var accessTokenSecret = localStorage.getItem("accessTokenSecret");

        // アクセストークンが保存されていた場合
        if (accessTokenKey) {
            // 保存していたアクセストークンをセットする
            oauth.setAccessToken(accessTokenKey, accessTokenSecret);

            // アクセストークンが保存されていなかった場合
        } else {
            // 1. consumer key と consumer secret を使って、リクエストトークンを取得する
            oauth.fetchRequestToken(this.successFetchRequestToken, this.failureHandler);
        }
    };

    /**
     * 1の処理の成功時のコールバック関数
     */
    TwitterManager.prototype.successFetchRequestToken = function (authUrl) {
        // 2. リクエストトークンを使い、ユーザにアクセス許可を求めるURLを生成して ブラウザを起動
        // 3. ブラウザで認証を行い、ユーザーにPINが表示される
        console.log("browser open");
        var activity = new MozActivity({
            name:"view",
            data:{
                type:"url",
                url:authUrl
            }
        });

        // 4. アプリで用意したダイアログにPIN を入力してもらう
        var pin = prompt("Please enter your PIN", "");

        // oauthオブジェクトにPINをセット
        oauth.setVerifier(pin);

        // 5. consumer key, consumer secret, リクエストトークン, PIN を使って、アクセストークンを取得する
        // 注意：コールバック関数内でthisは使えない
        oauth.fetchAccessToken(self.successFetchAccessToken, self.failureHandler);
    };

    /**
     * 5の処理の成功時のコールバック関数
     */
    TwitterManager.prototype.successFetchAccessToken = function (authUrl) {
        // 取得したアクセストークンをWebStorageで保存する（次回以降のため）
        localStorage.setItem("accessTokenKey", oauth.getAccessTokenKey());
        localStorage.setItem("accessTokenSecret", oauth.getAccessTokenSecret());
        var twitterManager = new TwitterManager()
        twitterManager.getHomeTimeline();
    };

    /**
     * Home_timelineを取得する
     */
    TwitterManager.prototype.getHomeTimeline = function () {
        var url = "https://api.twitter.com/1.1/statuses/home_timeline.json";
        oauth.get(url, domManager.successGetHomeTimeline, this.failureHandler);
    };


    /**
     * Home_timelineを取得する（）
     */
    TwitterManager.prototype.getHomeTimelineMore = function () {
        var url = "https://api.twitter.com/1.1/statuses/home_timeline.json";
        //console.log("oldest = " + domManager.oldestId);
        url = url + "?max_id=" + (domManager.getOldestId() - 10);
        oauth.get(url, domManager.successGetHomeTimeline, this.failureHandler);
    };

    /**
     * ツイート投稿を行う
     */
    TwitterManager.prototype.newTweetPost = function () {
        var data;

        // テキストボックスの中身を取得
        var statusText = document.getElementById("newTweetText").value;

        // fileの中身を確認
        var file = document.querySelector("#file").files[0];

        // fileに中身がない場合、通常投稿
        if (typeof file === "undefined") {
            // dataオブジェクトに投稿内容を格納
            data = {
                status:statusText
            };
            // 投稿
            oauth.post('https://api.twitter.com/1.1/statuses/update.json', data,
                this.successHandler, this.failureHandler);

            // fileに中身がある場合、画像つき投稿
        } else {
            data = {
                "status":statusText,
                "media[]":file
            };
            oauth.request({
                method:"POST",
                url:"https://api.twitter.com/1.1/statuses/update_with_media.json",
                data:data
            });
        }
    };

    /**
     * 成功時のハンドラ
     */
    TwitterManager.prototype.successHandler = function (data) {
        console.log("success");
    };

    /**
     * 各処理失敗時のコールバック関数
     */
    TwitterManager.prototype.failureHandler = function (data) {
        console.error(data);
        alert(data);
    };

    return TwitterManager;
})();


var DomManager = (function () {

    var self;

    // 取得したなかでもっとも古いID
    var oldestId = Number.MAX_VALUE;

    function DomManager() {
        self = this;
    }

    /**
     * 表示している中でもっとも古いIDを取得する
     */
    DomManager.prototype.getOldestId = function () {
        return oldestId;
    }

    /**
     * 取得したTweetsを画面に表示する
     */
    DomManager.prototype.successGetHomeTimeline = function (data) {
        // JSON形式のデータをオブジェクトに格納する
        var tweetList = JSON.parse(data.text);
        // tweetListを１つずつ取り出して表示する
        for (var i = 0; i < tweetList.length; i++) {
            var tweet = tweetList[i];
            self.addTweetToDom(tweet);
        }
    };


    /**
     * Tweet(単体)をDisplayに表示する
     */
    DomManager.prototype.addTweetToDom = function (tweet) {
        var screenName = tweet.user.screen_name;
        var name = tweet.user.name;
        var tweetText = tweet.text;
        var prof_img_url = tweet.user.profile_image_url;

        var id = tweet.id;

        if (id < oldestId) {
            oldestId = id;
            console.log("oldest id = " + id);
        }

        var $parent = $("#tweetBox");
        var $li = $("<li>").appendTo($parent);
        var $div = $("<div>").addClass("tweet").appendTo($li);
        var $userDiv = $("<div>").appendTo($div);
        
        $("<img>").addClass("tweetIcon").attr('src', prof_img_url).appendTo($userDiv);
        $("<span>").addClass("name").text(name).appendTo($userDiv);
        $("<span>").addClass("screenName").text("@" + screenName).appendTo($userDiv);
        $("<div>").addClass("tweetText").text(tweetText).appendTo($div);
    };


    /**
     * 表示したTweetをすべて消す
     */
    DomManager.prototype.clearTweetDom = function () {
        oldestId = Number.MAX_VALUE;
        var parent = $("#tweetBox");
        parent.empty();
    };

    return DomManager;
})();
