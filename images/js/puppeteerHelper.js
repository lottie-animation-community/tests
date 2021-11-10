const submitAndWaitForResponse = (currentFrame, isLast, width, height) => (
  new Promise((resolve) => {
    window.continueExecution = function continueExecution() {
      resolve();
    };
    window.onMessageReceivedEvent({
      currentFrame,
      isLast,
      width,
      height,
    });
  })
);

export default {
  submitAndWaitForResponse,
};
