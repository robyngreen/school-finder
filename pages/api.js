// This is not used, but saved as an example of how to pass data from server to client.
// in server.get, return app.render(request, response, '/api', result);

import React from 'react'

export default class extends React.Component {
  static getInitialProps (props) {
    return { content: props.query }
  }

  render () {
    return JSON.stringify(this.props.content);
  }
}
