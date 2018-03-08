import React, { Component } from 'react';
//import { ApolloClient, gql, graphql, ApolloProvider } from 'react-apollo';
import Topic from './Topic.jsx';

class App extends Component {
  constructor() {
    super();
    this.state = {};
  }
  render() {
    return (
      <div className="App">
        <h1>Welcome To The Topic Zone</h1>
        <Topic />
      </div>
    );
  }
}

export default App;
