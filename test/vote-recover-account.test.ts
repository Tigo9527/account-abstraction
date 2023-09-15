import { ethers } from 'hardhat'
import { expect } from 'chai'
import { ERC1967Proxy__factory, VoteRecoverAccount, VoteRecoverAccount__factory } from '../typechain'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { AddressZero } from './testutils'

async function deployVoteRecoverAccount (accounts: SignerWithAddress[]): Promise<VoteRecoverAccount> {
  const impl = await new VoteRecoverAccount__factory(accounts[0]).deploy(ethers.constants.AddressZero)
  // console.log('impl is ', impl.address, ' chain ', await accounts[0].provider?.getNetwork())
  const { data } = await impl.populateTransaction.initialize(accounts[0].address)
  const proxy = await new ERC1967Proxy__factory(accounts[0]).deploy(impl.address, data!)
  return VoteRecoverAccount__factory.connect(proxy.address, accounts[0])
}

describe('VoteRecoverAccount', function () {
  let accounts: SignerWithAddress[]
  let voteRecoverAcc: VoteRecoverAccount
  before(async function () {
    accounts = await ethers.getSigners()
    voteRecoverAcc = await deployVoteRecoverAccount(accounts)
  })

  it('add participant', async () => {
    const task = await voteRecoverAcc.changeParticipants([accounts[1].address], [true])
    await expect(task).to.emit(voteRecoverAcc, voteRecoverAcc.interface.events['ParticipantChanged(address,bool)'].name)
      .withArgs(accounts[1].address, true)
  })

  it('remove participant', async () => {
    const task = await voteRecoverAcc.changeParticipants(
      [accounts[2].address, accounts[2].address], [true, false])
    await expect(task).to.emit(voteRecoverAcc, voteRecoverAcc.interface.events['ParticipantChanged(address,bool)'].name)
      .withArgs(accounts[2].address, false)
  })

  it('onlyOwner add participant', async () => {
    const task = voteRecoverAcc.connect(accounts[1]).changeParticipants(
      [accounts[2].address, accounts[2].address], [true, false])
    await expect(task).be.revertedWith('only owner')
  })

  it('onlyParticipants vote', async () => {
    const task = voteRecoverAcc.connect(accounts[9]).vote(accounts[9].address)
    await expect(task).be.revertedWith('onlyParticipant')
  })

  describe('vote', function () {
    it('insufficient votes', async () => {
      const acc = await deployVoteRecoverAccount(accounts)
      await Promise.all(accounts.slice(0, 2).map(s =>
        acc.changeParticipants([s.address], [true]).then(tx => tx.wait())
          .then(async () => {
            return acc.connect(s).vote(s.address)
          }).then(tx => tx.wait())))
      await expect(acc.recover(accounts[0].address)).be.revertedWith('insufficient votes')
    })

    it('recover', async () => {
      const acc = await deployVoteRecoverAccount(accounts)
      const newOwner = accounts[1].address
      await Promise.all(accounts.slice(0, 3).map(s =>
        acc.changeParticipants([s.address], [true]).then(tx => tx.wait())
          .then(async () => {
            return acc.connect(s).vote(newOwner)
          }).then(tx => tx.wait())))
      await expect(await acc.recover(newOwner)).to.emit(acc, 'OwnerChanged')
        .withArgs(accounts[0].address, newOwner)
      expect(accounts[0].address).not.eq(newOwner, 'should change owner')
      expect(await acc.owner()).eq(newOwner, 'should be new owner')

      await expect(acc.changeParticipants([], [])).be.revertedWith('only owner')
      expect(await acc.getParticipants().then(res => res.length)).eq(3, 'should get all participants')
      await Promise.all(accounts.slice(0, 3).map(async s => expect(await acc.votes(s.address)).eq(AddressZero, 'should clear vote')))
    })
  })
})
