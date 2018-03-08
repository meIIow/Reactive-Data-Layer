import React from 'react';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';
import Comments from './Comments.jsx';

const topicQuery = gql`
  query {
    Topics {
      content 
      author
      comments {
        author
        text
      }
    }
  }
`;
const Topic = (props) => {
  if (props.data.loading) {
    return <p>Loading...</p>;
  } else if (props.data.error) {
    return <p>{props.data.error.message}</p>;
  }
  const topics = props.data.Topics.map((topic) => {
    return (
      <div className="topic">
        <h2>{topic.content}</h2>
        <h3>{topic.author}</h3>
        <Comments comments={topic.comments} />
      </div>
    );
  });
  return <div className="topic-box">{topics}</div>;
};

export default graphql(topicQuery)(Topic);
