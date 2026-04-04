import { Interface, JsonFragment } from '@ethersproject/abi'
import crypto from 'crypto'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { ethers } from 'hardhat'

export function getERC165InterfaceID (abi: JsonFragment[]): string {
  let interfaceId =
    abi
      .filter(it => it.type === 'function' && it.name != null)
      .map(it => {
        const iface = new Interface([it])
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return iface.getSighash(it.name!)
      })
      .map((x) => parseInt(x, 16))
      .reduce((x, y) => x ^ y)
  interfaceId = interfaceId > 0 ? interfaceId : 0xFFFFFFFF + interfaceId + 1
  return '0x' + interfaceId.toString(16).padStart(8, '0')
}

export function signRsa (rawInput: string, privateKey: crypto.KeyObject): string {
  // @ts-ignore
  return '0x' + crypto.sign('sha256', rawInput?.startsWith('0x') ? Buffer.from(rawInput.slice(2), 'hex') : Buffer.from(rawInput), {
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_PADDING
  }).toString('hex')
}

export async function getSigner (): Promise<SignerWithAddress> {
  const signer = await ethers.getSigners().then(res => res[0])
  return signer
}
