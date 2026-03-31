import { ethers } from 'hardhat'
import { expect } from 'chai'
import {
  ERC1967Proxy__factory, RsaAccount,
  RsaAccount__factory
} from '../typechain'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { BytesLike } from '@ethersproject/bytes'
import { UserOperation } from './UserOperation'
import { AddressZero } from './testutils'
import crypto from 'crypto'
// import { base64 } from 'ethers/lib/utils'
import { getUserOpHash } from './UserOp'
import { signRsa } from '../src/Utils'
async function deployAccount (accounts: SignerWithAddress[], exponent: BytesLike, modulus: BytesLike): Promise<RsaAccount> {
  const impl = await new RsaAccount__factory(accounts[0]).deploy(accounts[0].address)
  // console.log('impl is ', impl.address, ' chain ', await accounts[0].provider?.getNetwork())
  const { data } = await impl.populateTransaction.initialize(exponent, modulus)
  const proxy = await new ERC1967Proxy__factory(accounts[0]).deploy(impl.address, data!)
  await proxy.deployed()
  return RsaAccount__factory.connect(proxy.address, accounts[0])
}

describe('RsaAccount', function () {
  let accounts: SignerWithAddress[]
  let voteRecoverAcc: RsaAccount
  let rawInput: string
  let sig: string
  let randomPk: crypto.KeyObject
  before(async function () {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      // The standard secure default length for RSA keys is 2048 bits
      modulusLength: 1024
    })
    randomPk = privateKey
    // const jwk = publicKey.export({ format: 'der', type: 'pkcs1' })
    const jwk = publicKey.export({ format: 'jwk' })
    // console.log('public key', publicKey)
    // console.log('exported ', jwk)
    const n = Buffer.from(jwk.n!, 'base64').toString('hex')
    // console.log('n ', n)
    // const e = Buffer.from(jwk.e!, 'base64').toString('hex')
    // console.log('e ', e)
    // return
    rawInput = 'hello'
    sig = signRsa(rawInput, privateKey)

    accounts = await ethers.getSigners()
    // default value
    const exponent = '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010001'
    // const exponent = '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010001'
    // const modulus = 'C88781D7BC4D6900C705D1A915C7F652894EC6BB75EC88F577B591BDF14B7E9797063E684AF1621BDF9E278A0E3BDAE4D804F33EBA9BFF5D3A330F98F04876950759FA309400FB1FE33563D89AD5C863146EBF76B055FFA1EA0807AEACEB621A6E53239D5FB6C47E95BEA053BE64E660FCBB4E8B4FA4876D5163B75B831EFD89'
    // const modulus = 'be4dfe6bfa852b240b1b47a7aee3a0615e583e439edc3d7e317e1db6a0b26597e6d786b7ddc4edb7affec16620d39dcb154136882b8e0f50c8b6bb428910df0e90414f61e90fa6f95ca5ce6eeb136dd71bb158dc0a614ebb8a85b5d10063fb54902ab10f4367c84a766fb5a1254962304ad3299bd1e9466c3480971e9962aded'
    voteRecoverAcc = await deployAccount(accounts, exponent, '0x' + n)
  })

  it('pure ras verify', async () => {
    const task = await voteRecoverAcc.testRsa(Buffer.from(rawInput), sig)
    expect(task).eq(true, 'succeeded to test ras')
  })
  it('verify', async () => {
    const op: UserOperation = {
      callData: '0x',
      callGasLimit: 1,
      initCode: '0x',
      maxFeePerGas: 1,
      maxPriorityFeePerGas: 1,
      nonce: 1,
      paymasterAndData: '0x',
      preVerificationGas: 1,
      sender: AddressZero,
      verificationGasLimit: 1,
      signature: ''
    }
    const { chainId } = await accounts[0].provider!.getNetwork()
    const opHash = getUserOpHash(op, await voteRecoverAcc.entryPoint(), chainId)
    // console.log('op hash', opHash)
    op.signature = signRsa(opHash, randomPk)
    // const [exponent, modulus] = await Promise.all([
    //   voteRecoverAcc.getExponent(),
    //   voteRecoverAcc.getModulus()
    // ])
    // console.log('modulus', modulus)
    // console.log('exponent', exponent)

    const taskOp = await voteRecoverAcc.callStatic.validateUserOp(op, opHash, 0)
    expect(taskOp).eq(0, 'succeeded to validateUserOp')
  })
})
