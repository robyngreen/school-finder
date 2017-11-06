'use strict';

import React from 'react';

export default class Header extends React.Component {

  constructor () {
    super();
  }

  render() {
    return (
      <div className="header">
        <div className="headerContainer">
          <h1>SchoolFinder</h1>
        </div>

        <style jsx>{`
          .header {
            width: 100%;
          }

          .headerContainer {
            height: 50px;
            background: rgb(55, 115, 189);
            border-bottom: 1px solid black;
          }

          .header h1 {
            margin: 0 0 0 1.5rem;
            color: white;
          }

        `}</style>
      </div>
    );
  }
}
