import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { ethers } from 'hardhat'

const deploySimpleAccountFactory: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const provider = ethers.provider
  const from = await provider.getSigner().getAddress()
  const network = await provider.getNetwork()
  // only deploy on local test network.
  if (network.chainId !== 31337 && network.chainId !== 1337) {
    // console.log(`skip for non-local network`)
    // return
  }

  // const entrypoint = await hre.deployments.get('EntryPoint')
  const ret = await hre.deployments.deploy(
    'SimpleAccountFactory', {
      from,
      // args: [entrypoint.address],
      args: ['0x7ad823a5ca21768a3d3041118bc6e981b0e4d5ee'],
      // gasLimit: 6e6,
      log: true,
      // deterministicDeployment: true,
      skipIfAlreadyDeployed: false
    })
  console.log('==SimpleAccountFactory addr=', ret.address)
}

export default deploySimpleAccountFactory
