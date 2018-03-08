import React from 'react';

const Comments = (props) => {
  const comments = props.comments.map((comment) => {
    return (
      <div className="comment">
        <p><strong>{comment.author}:  </strong>{comment.text}</p>
      </div>
    );
  });
  return <div className="comment-box">{comments}</div>;
};

export default Comments;
