import React from 'react';

class Viewport extends React.Component {

    render() {

        return(
            <div className="test">
                <div>
                    <div>1</div>
                    <div>2</div>
                    <div>
                        <div>
                            <div>
                                <div>3</div>
                            </div>
                        </div>
                        <div>4</div>
                    </div>
                </div>
            </div>
        )
    }
}

export default Viewport;