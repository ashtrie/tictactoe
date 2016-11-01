import React from 'react';
import ReactDOM from 'react-dom';

//for material-ui--------------------------------------------------------------
import injectTapEventPlugin from 'react-tap-event-plugin';
injectTapEventPlugin();
//theme------------------------------------------------------------------------
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import getMuiTheme from 'material-ui/styles/getMuiTheme';

let style = {};
//colors----------------------------------------------------------------------
import { red100, red500, grey900, cyan500 } from 'material-ui/styles/colors';

style.theme = getMuiTheme({
	palette: {
		textColor: grey900,
    	primary1Color: cyan500,
    	primary2Color: red500,
    	primary3Color: red100
  	}
});

//app bar---------------------------------------------------------------------
import AppBar from 'material-ui/AppBar';
//paper-----------------------------------------------------------------------
import Paper from 'material-ui/Paper';
import Divider from 'material-ui/Divider';

style.paper = {
    padding: '10px 15px 20px'
};

//textfield-------------------------------------------------------------------
import TextField from 'material-ui/TextField';
//button----------------------------------------------------------------------
import RaisedButton from 'material-ui/RaisedButton';

style.menuBtn = {
    float: 'right'
};

let socket = io('http://localhost:3000/');

let App = React.createClass({
    getInitialState: function() {
        return {
            gameHost: 'http://localhost:3000/',
            clientId: null,
            gameId: '',
            gameParams: {
                userName: '',
                sessId: '',
            },
            gameMessage: 'Choose player',
            availGames: [],
            game: null,
			messages: [],
			message: ''
        };
    },
    componentDidMount: function() {
        socket.on('connect', () => {
            this.setState({
                clientId: socket.io.engine.id
            });
            this.initializeGameParams();
        });

        socket.on('begin_game', (game) => {
            this.setState({
                gameId: game.id
            });

            if (game.currentPlayer.id === this.state.clientId) {
                this.updateBoard(game.board, true, game.aiscore);
                this.setState({ gameMessage: 'Game started! You make turn first!' });
            }
            else {
                this.updateBoard(game.board, false, game.aiscore);
                this.setState({ gameMessage: 'Game started! Opponent makes turn first!' });
            }
        });

        socket.on('turn_played', (game) => {
            if (game.currentPlayer.id === this.state.clientId) {
                this.updateBoard(game.board, true, game.aiscore);
                this.setState({ gameMessage: 'Your Turn Now!' });
            } else {
                this.updateBoard(game.board, false, game.aiscore);
                this.setState({ gameMessage: 'Waiting for Other Player!' });
            }
        });

        socket.on('available_games', (players) => {
            this.setState({
                availGames: []
            });

            for (var i = 0; i < players.length; ++i) {
                if (players[i].id !== this.state.clientId) {
                    let tmp = this.state.availGames;
                    tmp.push(players[i]);
                    this.setState({
                        availGames: tmp
                    });
                }
            }
        });

        socket.on('player_update', (player) => {
            if (player.id !== this.state.clientId) {
                if (player.state === 'new') {
                    let isPresented = false;
                    let presentIndex = null;
                    this.state.availGames.forEach((item, i) => {
                        if (item.id === player.id) {
                            isPresented = true;
                            presentIndex = i;
                        }
                    });
                    let tmp = this.state.availGames;
                    if (!isPresented) {
                        tmp.push(player);
                    }
                    else {
                        tmp[presentIndex] = player;
                    }
                    this.setState({
                        availGames: tmp
                    });
                }
                else if (player.state === "left") {
                    let tmp = this.state.availGames;
                    for (let i = 0; i < tmp.length; ++i) {
                        if (tmp[i].id === player.id) {
                            tmp.splice(i, 1);
                        }
                    }
                    this.setState({
                        availGames: tmp
                    });
                }
                else if (player.state === "playing") {
                    let tmp = this.state.availGames;
                    tmp.forEach((item, i) => {
                        if (item.id === player.id) {
                            item.state = player.state;
                        }
                    });
                    this.setState({
                        availGames: tmp
                    });
                }
                else if (player.state === "pending") {
                    let tmp = this.state.availGames;
                    tmp.forEach((item, i) => {
                        if (item.id === player.id) {
                            item.state = player.state;
                        }
                    });
                    this.setState({
                        availGames: tmp
                    });
                }
            }
        });

        socket.on('request_to_join', (game) => {
            if (game.playerO.id === this.state.clientId) {
                let req_id = game.id;
                this.setState({
                    game: game,
                    gameMessage: 'Answer incoming request',
                })
            }
        });

        socket.on('game_won', (data) => {
            this.updateBoard(data.game.board, false, data.game.aiscore);
            if (data.winner.id === this.state.clientId) {
                this.setState({
                    gameMessage: 'You won!'
                });
            }
            else {
                this.setState({
                    gameMessage: 'You lost!'
                });
            }

            this.setState({
                game: null
            });
        });

        socket.on('stale_mate', (data) => {
            this.setState({
                gameMessage: 'Stale mate!'
            });
            this.updateBoard(data.board, false);
            this.setState({
                game: null
            });
        });

		socket.on('chat_message', (msg) => {
    		let messages = this.state.messages;
			messages.push(msg);
			this.setState({
				messages: messages
			});
  		});

    },
    initializeGameParams: function() {
        this.setState({
            gameId: this.state.gameId,
            gameParams: {
                userName: this.state.clientId,
                sessId: this.state.clientId,
            },
        });
    },
    requestToJoinClick: function() {
        let joinDetails = {
            gameId: this.state.game.id
        };
        socket.emit('joinGame', joinDetails);
    },
    playTurn: function(row, quad) {
        let playerInfo = {
            gameId: this.state.gameId,
            player: this.state.clientId,
            action: { row: row, quad: quad }
        };
        socket.emit('playTurn', playerInfo);
    },
    addOpenGameClick: function(player) {
        let startDetails = {
            requestID: this.state.clientId,
            openPlayerID: player.id,
            action: 'Request Game'
        };
        this.setState({
            gameMessage: 'Game request for ' + (player.playerName ? player.playerName : player.id),
        });
        socket.emit('requestGame', startDetails);
    },
    updateBoard: function(game_data, activate, scores) {
        for (let i = 0; i < 3; ++i) {
            for (let r = 0; r < 3; ++r) {
                let rowindex = 'row' + i + '_' + r;
                if (game_data[i][r] === 0 && activate) {
                    this.refs[rowindex].innerHTML = '';
                    this.refs[rowindex].onclick = () => this.playTurn(i, r);
                }
                else if (game_data[i][r] === 0 && !activate) {
                    this.refs[rowindex].innerHTML = '';
                    this.refs[rowindex].onclick = null;
                }
                else if (game_data[i][r] !== 0) {
                    this.refs[rowindex].onclick = null;
                    if (game_data[i][r] === this.state.clientId) {
                        this.refs[rowindex].innerText = 'X';
                    }
                    else {
                        this.refs[rowindex].innerText = 'O';
                    }
                }
            }
        }
    },
	handleNameChange: function(event) {
		let user = event.target.value;
        this.setState({
            gameParams: {
                userName: user
            }
        })
        socket.emit('updatePlayerName', { name: user });
	},
	handleMessageChange: function(event) {
		this.setState({
      		message: event.target.value
    	});
	},
	sendMessageClick: function() {
		let message = this.state.message;
		if (message.trim() !== '') {
			socket.emit('chat_message', this.state.gameParams.userName + ': ' + message);
			this.setState({
				message: ''
			});
		}
	},
    componentWillUnmount: () => {
        socket.removeListener('connect');
        socket.removeListener('begin_game');
        socket.removeListener('turn_played');
        socket.removeListener('server_message');
        socket.removeListener('game_message');
        socket.removeListener('available_games');
        socket.removeListener('player_update');
        socket.removeListener('request_to_join');
        socket.removeListener('game_won');
        socket.removeListener('stale_mate');
		socket.removeListener('chat_message');
    },
    render: function() {
        let availGames = this.state.availGames.map((item, i) => {
            if (item.playerName !== item.id) {
				let requestBtn = (
					<div key={ i } className="player">
						<div className="playerName">{ item.playerName ? item.playerName : item.id }</div>
						<RaisedButton
							label="join"
							primary={ true }
							onClick={ () => this.requestToJoinClick() }
							disabled={ this.state.gameParams.userName === '' || this.state.gameParams.userName === this.state.clientId }
						/>
					</div>
				);

                switch(item.state) {
                    case 'playing':
                        return (
							<div key={ i } className="player">
								<div className="playerName">Game started with { item.playerName ? item.playerName : item.id }</div>
							</div>
						);
                        break;
                    case 'pending':
                        if (this.state.game && this.state.game.playerX.id === item.id) {
                            return requestBtn;
                        }
                        else {
                            return (
								<div key={ i } className="player">
                                    <div className="playerName">Request for { item.playerName ? item.playerName : item.id }</div>
                                </div>
							);
                        }
                        break;
                    case 'new':
                        if (this.state.game && this.state.game.playerX.id === item.id) {
                            return requestBtn;
                        }
                        else {
                            return (
                                <div key={ i } className="player">
                                    <div className="playerName">{ item.playerName ? item.playerName : item.id }</div>
                                    <RaisedButton
                                        label="play"
                                        primary={ true }
                                        onClick={ () => this.addOpenGameClick(item) }
										disabled={ this.state.gameParams.userName === '' || this.state.gameParams.userName === this.state.clientId }
                                    />
                                </div>
                            );
                        }
                        break;
                    default:
                        break;
                }
            }
        });
		let messages = this.state.messages.map((item, i) => {
			return (
				<div key={ i } className="message">{ item }</div>
			);
		});

        return (
            <div>
                <header>
                    <AppBar
                        className="app-bar"
                        title="XO TicTacToe Online"
                        iconElementLeft={ <div></div> }
                        iconElementRight={ <div></div> }
                    />
                </header>

                <div className="flex-container">

                    <div className="menu">
                        <Paper style={ style.paper } zDepth={ 2 }>
                            <h3>Avaliable players</h3>
                            <Divider/>
                            <div className="availableGames">{ availGames }</div>
                        </Paper>
                    </div>

                    <div>
                        <Paper style={ style.paper } zDepth={ 4 }>
                            <div className="gameStatus">
								<TextField
									hintText="Type your name here..."
									onChange={ this.handleNameChange }
									floatingLabelText="Your name"
								/>
								<h4>{ this.state.gameMessage }</h4>
                            </div>

                            <div className="gameViewBox">
                                <div className="row0_0" ref="row0_0"></div>
                                <div className="row0_1" ref="row0_1"></div>
                                <div className="row0_2" ref="row0_2"></div>
                                <div className="row1_0" ref="row1_0"></div>
                                <div className="row1_1" ref="row1_1"></div>
                                <div className="row1_2" ref="row1_2"></div>
                                <div className="row2_0" ref="row2_0"></div>
                                <div className="row2_1" ref="row2_1"></div>
                                <div className="row2_2" ref="row2_2"></div>
                            </div>

                        </Paper>
                    </div>

                    <div className="chat">
						<Paper style={ style.paper } zDepth={ 2 }>
							<h3>Chat</h3>
							<Divider/>
							<div className="messages">
								{ messages }
							</div>
							<TextField
								hintText="Type your message here..."
								value={ this.state.message }
          						onChange={ this.handleMessageChange }
								disabled={ this.state.gameParams.userName === '' || this.state.gameParams.userName === this.state.clientId }
							/>
							<RaisedButton
								label="send"
								primary={ true }
								onClick={ () => this.sendMessageClick() }
								disabled={ this.state.gameParams.userName === '' || this.state.gameParams.userName === this.state.clientId }
							/>
						</Paper>
                    </div>
                </div>
            </div>
        );
    }
});

ReactDOM.render(
    <MuiThemeProvider muiTheme={ style.theme }>
		<App/>
	</MuiThemeProvider>, document.getElementById('root'));
