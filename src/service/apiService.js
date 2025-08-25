// URL replacement function to fix AWS file paths
export function replaceURL(text) {
    if (!text) return "";
    
    // Access url from the gameSdk scope
    const url = "https://games.swunmath.com/backend/api/v1";
    
    return text.replace(
      /\/AssessmentSetup\/LibraryFileManager\/GetLibraryVideoFile\?keyName=([^"]+)/g,
      (match, keyName) => {
        return `${url}/aws/get-file?keyName=${keyName}`;
      }
    );
}
const gameSdk =(function(){
    // Initialize parameters from URL
    const parseUrlParams = () => {
        const urlParams = new URLSearchParams(window.location.search);
        return {
            userId: (urlParams.get('userId') || urlParams.get('UserId')) ?? null,
            standarId: (urlParams.get('standarId') || urlParams.get('StandardId')) ?? null,
            lnpid: (urlParams.get('lnpid') || urlParams.get('LnpId')) ?? null,
            gameId: (urlParams.get('gameId') || urlParams.get('GameId')) ?? null
        };
    };
    
    // Get parameters from URL
    const params = parseUrlParams();
    let userId = params.userId;
    let standarId = params.standarId;
    let lnpid = params.lnpid;
    let gameId = params.gameId;
    let url="https://games.swunmath.com/backend/api/v1";
    return {
        setParamater(userIdPr,standarIdPr,lnpidPr,gameIdPr){
            userId=userIdPr;
            standarId = standarIdPr;
            lnpid = lnpidPr;
            gameId = gameIdPr;
        },
        getQuestion: function (cbOnProgess=null,cbOnLoad=null,onFailed=null) {
            try {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', `${url}/Students/LearningPath/${lnpid}/Standard/${standarId}?game=true&gameId=${gameId}`, true);
                xhr.setRequestHeader('Content-Type', 'application/json');
                xhr.setRequestHeader('UserId', userId);
                xhr.onprogress = function(event) {
                    if (event.lengthComputable) {
                        if (cbOnProgess!=null) {
                            cbOnProgess(event);
                        }
                    }
                };
                xhr.onload = function() {
                    if (xhr.status === 200) {
                        let apiData = JSON.parse(xhr.responseText);
                        if (cbOnLoad!=null) {
                            if (apiData && apiData.result) {
                                let metaData=null;
                                if (apiData.result.gameConfig){
                                    metaData=JSON.parse(apiData.result.gameConfig);
                                }
                                let formatResponse={    
                                    metaData:metaData,
                                    question:apiData.result.questions.map(x=>({id:x.id,question:x.questionText,correctAnswer:x.correctAnswer.split("").join(","),difficulty:apiData.result.difficultyConvert,questionType:x.questionType.code,choices:JSON.parse(x.answerOptions).answers.map(y=>({key:y.OptionLabel,text:y.OptionText}))}))
                                }
                                cbOnLoad(formatResponse);
                            }
                        }
                    } else {
                        if (onFailed!=null) {
                            onFailed()
                        }
                    }
                };
                xhr.onerror = function() {
                    if (onFailed!=null) {
                        onFailed()
                    }
                };
                xhr.send();
            } catch (error) {
                console.log(error);
                if (onFailed!=null) {
                    onFailed()
                }
            }
        },
        startGame: function (cbOnLoad=null,onFailed=null) {
            try {
                const xhr = new XMLHttpRequest();
                xhr.open('POST', `${url}/Students/Game/Start`, true);
                xhr.setRequestHeader('Content-Type', 'application/json');
                xhr.setRequestHeader('UserId', userId);
                xhr.onload = function() {
                    if (xhr.status === 200) {
                        let apiData = JSON.parse(xhr.responseText);
                        if (cbOnLoad!=null) {
                            cbOnLoad(apiData.result);
                        }
                    } else {
                        if (onFailed!=null) {
                            onFailed();
                        }
                    }
                };
                xhr.onerror = function() {
                    if (onFailed!=null) {
                        onFailed();
                    }
                };
                const data = {
                    standardId: standarId,
                    learningPathId: lnpid,
                    gameId: gameId
                };
                xhr.send(JSON.stringify(data));
            } catch (error) {
               console.log(error);
               if (onFailed!=null) {
                    onFailed();
                }
            }
        },

        // Function 3: completeGame - Hoàn thành trò chơi
        completeGame: function (postData,cbOnLoad=null,onFailed=null) {
            try {
                const xhr = new XMLHttpRequest();
                xhr.open('POST', `${url}/Students/Game/Complete`, true);
                xhr.setRequestHeader('Content-Type', 'application/json');
                xhr.setRequestHeader('UserId', userId);
                xhr.onload = function() {
                    if (xhr.status === 200) {
                        let apiData = JSON.parse(xhr.responseText);
                        if(cbOnLoad!=null){
                            cbOnLoad(apiData);
                        }
                        
                    } else {
                        if (onFailed!=null) {
                            onFailed()
                        }
                    }
                };
                xhr.onerror = function() {
                    if (onFailed!=null) {
                        onFailed()
                    }
                };
                xhr.send(JSON.stringify(postData));
            } catch (error) {
               console.log(error);
                if (onFailed!=null) {
                    onFailed()
                }
            }
        },

        // Function 4: post - Gửi dữ liệu lên server
        postQuestiion: async function (postData,cbOnLoad=null,onFailed=null) {
            try {
                const xhr = new XMLHttpRequest();
                xhr.open('POST', `${url}/Students/Game/Question`, true);
                xhr.setRequestHeader('Content-Type', 'application/json');
                xhr.setRequestHeader('UserId', userId);
                xhr.onload = function() {
                    if (xhr.status === 200) {
                        let apiData = JSON.parse(xhr.responseText);
                        if(cbOnLoad!=null){
                            cbOnLoad(apiData);
                        }
                        
                    } else {
                        if (onFailed!=null) {
                            onFailed()
                        }
                    }
                };
                xhr.onerror = function() {
                    if (onFailed!=null) {
                        onFailed()
                    }
                };
                xhr.send(JSON.stringify(postData));
            } catch (error) {
               console.log(error);
                if (onFailed!=null) {
                    onFailed()
                }
            }
        },
        loadGameLeaderBoard: function (cbOnLoad=null,onFailed=null) {
            try {
                if (userId==null) {
                    if (cbOnLoad) {
                        cbOnLoad({leaderBoard:leaderBoardUser})
                    }
                    return;
                }
                let dataFilter={
                    inTop:10,
                    standardId:standarId,
                    learningPathId:lnpid,
                    gameId:gameId
                }
                const xhr = new XMLHttpRequest();
                xhr.open('POST', `${url}/Students/Leaderboard`, true);
                xhr.setRequestHeader('Content-Type', 'application/json');
                xhr.setRequestHeader('UserId', userId);
                xhr.onload = function() {
                    if (xhr.status === 200) {
                        let apiData = JSON.parse(xhr.responseText);
                        if (apiData && apiData.result&& apiData.result.length>0) {
                            let formatResponse={
                                leaderBoard:apiData.result.map((x,index)=>{
                                  return {
                                        rank:(index+1)>dataFilter.inTop?0:(index+1),
                                        name:x.studentName,
                                        score:x.score
                                    }  
                                })
                            }
                            if(cbOnLoad!=null){
                                cbOnLoad(formatResponse);
                            }
                        }
                       
                    } else {
                        if (onFailed!=null) {
                            onFailed()
                        }
                    }
                };
                xhr.onerror = function() {
                    if (onFailed!=null) {
                        onFailed()
                    }
                };
               
                xhr.send(JSON.stringify(dataFilter));
            } catch (error) {
               console.log(error);
                if (onFailed!=null) {
                    onFailed()
                }
            }
        }
    }
})();

export default gameSdk;