import React from 'react';
import classNames from 'classnames';
import './App.css';

import Flipbook from './Flipbook';

class App extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            pages: [null,'images/1.jpg' , 'images/2.jpg', 'images/3.jpg', 'images/4.jpg', 'images/5.jpg', 'images/6.jpg'],
            pagesHiRes: [null,'images-large/1.jpg' , 'images-large/2.jpg', 'images-large/3.jpg', 'images-large/4.jpg', 'images-large/5.jpg', 'images-large/6.jpg'],
            hasMouse: true
        };
        this.app = React.createRef();
    }

    hasMouseChange = () => {
        this.setState({hasMouse: false})
    };

    render(){
        let appClass = classNames({
            hasMouse: true,
            'has-mouse': this.state.hasMouse
        });
        return(
            <div id="app" ref={this.app} className={appClass} onTouchStart={this.hasMouseChange}>
                <Flipbook
                    pages={this.state.pages}
                    pagesHiRes={this.state.pagesHiRes}
                />
            </div>
        )
    }
}

export default App;
