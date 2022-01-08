
const errors = document.getElementById('errors');

export function displayError(error) {

  console.warn(error);

  // create div.error
  const div = document.createElement('div');
  div.classList.add('error');
  div.innerText = error;

  // append div.error to the top of #errors
  errors.insertBefore(div, errors.firstChild);

  // remove div.error after 5 seconds
  let timerTimeout = setTimeout(() => {
    div.remove();
  }, 5000);

  // scroll to the top of #errors
  errors.scrollTop = 0;

  // if the user clicks on the error, remove it and clear the timer
  div.onclick = () => {
    div.remove();
    clearTimeout(timerTimeout);
  };

}
