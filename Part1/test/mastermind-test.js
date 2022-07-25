//[assignment] write your own unit test to show that your Mastermind variation circuit is working as expected

const { expect, assert, AssertionError } = require('chai')
const { ethers } = require('hardhat')
const { groth16, plonk } = require('snarkjs')

const wasm_tester = require('circom_tester').wasm
const { buildPoseidon }= require('circomlibjs')

const zero = BigInt(0)
const one = BigInt(1)
const n256 = BigInt(255)

function fromLittleEndian(bytes) {
    let result = zero
    let base = one
    bytes.forEach(function (byte) {
        result += base * BigInt(byte)
        base *= n256
    });
    return result
}

function fromBigEndian(bytes) {
  return fromLittleEndian(bytes.reverse());
}

describe('Bagles', () => {
  it('should reject out of bounds guess', async () => {
    const circuit = await wasm_tester('contracts/circuits/MastermindVariation.circom')
    const input = {
      'guess' : [1, 0, 99],
      'solution' : [1 , 2, 3],
      'red' : 1,
      'white' : 0,
      'hash' : 123,
      'salt' : 123,
    }

    try {
      await circuit.calculateWitness(input, true)
      // if calculate witness doesn't throw the test should fail
      expect(true).to.equal(false)
    } catch(err) {
      // pattern match the error message since it includes line numbers
      expect(err).to.be.an('Error')
      expect(err.toString()).to.have.string('Assert Failed')
    }
  })

  it('should reject incorrect red/white count', async () => {
    const circuit = await wasm_tester('contracts/circuits/MastermindVariation.circom')
    const input = {
      'guess' : [1, 0, 2],
      'solution' : [1 , 2, 3],
      'red' : 2, // correct:1
      'white' : 2, // correct:1
      'hash' : 123,
      'salt' : 123,
    }

    try {
      await circuit.calculateWitness(input, true)
      // if calculate witness doesn't throw the test should fail
      expect(true).to.equal(false)
    } catch(err) {
      // pattern match the error message since it includes line numbers
      expect(err).to.be.an('Error')
      expect(err.toString()).to.have.string('Assert Failed')
    }
  })

  it('produce a valid proof', async () => {
    const poseidon = await buildPoseidon()
    const hash = ethers.BigNumber.from(poseidon.F.toObject(poseidon([123, 1, 2, 3])))

    const circuit = await wasm_tester('contracts/circuits/MastermindVariation.circom')

    const input = {
      'guess' : [1, 3, 4],
      'solution' : [1, 2, 3],
      'red' : 1,
      'white' : 1,
      'hash' : hash,
      'salt' : 123,
    }

    const witness = await circuit.calculateWitness(input, true)
    circuit.assertOut(witness, { 'out' : hash })

    // this is redundant
    expect(witness[1]).to.equal(hash)
  })
  
  it('reject a wrong hash', async () => {
    const poseidon = await buildPoseidon()
    const hash = ethers.BigNumber.from(poseidon.F.toObject(poseidon([3000])))

    const circuit = await wasm_tester('contracts/circuits/MastermindVariation.circom')

    const input = {
      'guess' : [1, 3, 4],
      'solution' : [1, 2, 3],
      'red' : 1,
      'white' : 1,
      'hash' : hash,
      'salt' : 123,
    }

    try {
      await circuit.calculateWitness(input, true)
      // if calculate witness doesn't throw the test should fail
      expect(true).to.equal(false)
    } catch(err) {
      // pattern match the error message since it includes line numbers
      expect(err).to.be.an('Error')
      expect(err.toString()).to.have.string('Assert Failed')
    }
  })

  it('should reject a the correct solution with invalid salt', async () => {
    const poseidon = await buildPoseidon()
    const hash = ethers.BigNumber.from(poseidon.F.toObject(poseidon([123, 1, 2, 3])))

    const circuit = await wasm_tester('contracts/circuits/MastermindVariation.circom')

    const input = {
      'guess' : [1, 3, 4],
      'solution' : [1, 2, 3],
      'red' : 1,
      'white' : 1,
      'hash' : hash,
      'salt' : 999, // wrong salt
    }

    try {
      await circuit.calculateWitness(input, true)
      // if calculate witness doesn't throw the test should fail
      expect(true).to.equal(false)
    } catch(err) {
      // pattern match the error message since it includes line numbers
      expect(err).to.be.an('Error')
      expect(err.toString()).to.have.string('Assert Failed')
    }
  })
  
  it('should reject a the correct solution with invalid salt', async () => {
    const poseidon = await buildPoseidon()
    const hash = ethers.BigNumber.from(poseidon.F.toObject(poseidon([123, 1, 2, 3])))

    const circuit = await wasm_tester('contracts/circuits/MastermindVariation.circom')

    const input = {
      'guess' : [1, 3, 4],
      'solution' : [1, 9, 3],
      'red' : 1,
      'white' : 1,
      'hash' : hash,
      'salt' : 123,
    }

    try {
      await circuit.calculateWitness(input, true)
      // if calculate witness doesn't throw the test should fail
      expect(true).to.equal(false)
    } catch(err) {
      // pattern match the error message since it includes line numbers
      expect(err).to.be.an('Error')
      expect(err.toString()).to.have.string('Assert Failed')
    }
  })

  it('should produce different hashes for different salts', async () => {
    const poseidon = await buildPoseidon()
    const hashA = ethers.BigNumber.from(poseidon.F.toObject(poseidon([123, 1, 2, 3])))
    const hashB = ethers.BigNumber.from(poseidon.F.toObject(poseidon([321, 1, 2, 3])))

    const circuit = await wasm_tester('contracts/circuits/MastermindVariation.circom')
    
    const input = {
      'guess' : [1, 3, 4],
      'solution' : [1, 2, 3],
      'red' : 1,
      'white' : 1,
    }

    const witnessA = await circuit.calculateWitness(
      { ...input, 'salt' : 123, 'hash' : hashA }
    )
    const witnessB = await circuit.calculateWitness(
      { ...input, 'salt' : 321, 'hash' : hashB }
    )

    expect(witnessA[1]).not.to.equal(witnessB[1])
  })
})
