pragma circom 2.0.0;

// [assignment] implement a variation of mastermind from https://en.wikipedia.org/wiki/Mastermind_(board_game)#Variation as a circuit

include "../../node_modules/circomlib/circuits/comparators.circom";
include "../../node_modules/circomlib/circuits/bitify.circom";
include "../../node_modules/circomlib/circuits/poseidon.circom";

// this implements the 'Bagles' variation
// there are 10 colors and 3 holes to set

template MastermindVariation() {
  signal input guess[3];
  signal input solution[3];
  
  signal input red;
  signal input white;
  
  signal input hash;
  signal input salt;

  signal output out;

  // check that all guesses and solutions are withing [0,9]
  // using LessThan(256) so the failing assertion will be more obvious for reasonably
  // large numbers (asserts in line 32 or 37 fail and not LessThan itself)
  component lt[6];
  for (var i = 0; i < 3; i++) {
    lt[i] = LessThan(252);
    lt[i].in[0] <== guess[i];
    lt[i].in[1] <== 10;
    lt[i].out === 1;

    lt[i+3] = LessThan(252);
    lt[i+3].in[0] <== solution[i];
    lt[i+3].in[1] <== 10;
    lt[i+3].out === 1;
  }

  // count red and white pins
  // red: correct color and correct position
  var _red = 0;
  var _white = 0;
  component eq[9];
  
  for (var i = 0; i < 3; i++) {
    for (var j = 0; j < 3; j++) {
      eq[3*i+j] = IsEqual();
      eq[3*i+j].in[0] <== guess[i];
      eq[3*i+j].in[1] <== solution[j];

      // correct position
      _white += eq[3*i+j].out;
      // correct color and correct position
      if (i == j) {
        _white -= eq[3*i+j].out;
        _red += eq[3*i+j].out;
      }
    }
  }

  // check inputs for red and white are correct
  component eqRed = IsEqual();
  eqRed.in[0] <== red;
  eqRed.in[1] <== _red;
  eqRed.out === 1;
  
  component eqWhite = IsEqual();
  eqWhite.in[0] <== _white;
  eqWhite.in[1] <== white;
  eqWhite.out === 1;

  component poseidon = Poseidon(4);
  poseidon.inputs[0] <== salt;
  for (var i = 0; i < 3; i++) {
    poseidon.inputs[i+1] <== solution[i];
  }

  // verify that the hash provided is correct
  hash === poseidon.out;
  out <== poseidon.out;
}

component main = MastermindVariation();
