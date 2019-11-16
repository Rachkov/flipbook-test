import React from 'react';
import './ActionBar.css';

class ActionBar extends React.Component {
    render() {
        return(
            <div className="action-bar">
                <button className="btn" onClick={this.props.flipLeft}>left</button>
                <button className="btn" onClick={this.props.zoomOut}>minus</button>
                <span className="page-num">page {this.props.page} of {this.props.numPages}</span>
                <button className="btn" onClick={this.props.zoomIn}>plus</button>
                <button className="btn" onClick={this.props.flipRight}>right</button>
            </div>
        )
    }
}

export default ActionBar;